import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RateUserInput,
  RegisterInput,
  UpdateProfileInput,
} from "./users.schema";
import type {
  LoginResult,
  RateUserResult,
  RegisterResult,
  TechnologyDto,
  UserDto,
  UserStatsDto,
  UserWithTechnologiesDto,
} from "./users.types";

const MAX_FAILED_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  avatarUrl: true,
  description: true,
  avgRating: true,
  totalRatings: true,
  createdAt: true,
} as const;

const USER_WITH_TECHNOLOGIES_SELECT = {
  ...USER_SELECT,
  technologies: {
    select: {
      technology: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapUser(user: Prisma.UserGetPayload<{ select: typeof USER_SELECT }>): UserDto {
  return {
    ...user,
    role: user.role,
  };
}

function mapUserWithTechnologies(
  user: Prisma.UserGetPayload<{ select: typeof USER_WITH_TECHNOLOGIES_SELECT }>,
  stats?: UserStatsDto
): UserWithTechnologiesDto {
  return {
    ...mapUser(user),
    commentsCount: stats?.commentsCount ?? 0,
    solutionsCount: stats?.solutionsCount ?? 0,
    technologies: user.technologies.map(
      (relation): TechnologyDto => ({
        id: relation.technology.id,
        name: relation.technology.name,
        slug: relation.technology.slug,
      })
    ),
  };
}

async function getUserStats(userId: string): Promise<UserStatsDto> {
  const fallback: UserStatsDto = {
    commentsCount: 0,
    solutionsCount: 0,
  };

  try {
    const [commentRows, solutionRows] = await Promise.all([
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS "count"
        FROM "interactions"."comments"
        WHERE "authorId" = ${userId}
      `),
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS "count"
        FROM "publications"."publications"
        WHERE "authorId" = ${userId}
          AND "type" = CAST('ERROR_SOLUTION' AS "publications"."PublicationType")
      `),
    ]);

    return {
      commentsCount: commentRows[0]?.count ?? 0,
      solutionsCount: solutionRows[0]?.count ?? 0,
    };
  } catch (error) {
    console.warn("[getUserStats] Falling back to zeros:", error);
    return fallback;
  }
}

async function getLockSeconds(email: string): Promise<number> {
  const attempt = await prisma.loginAttempt.findUnique({
    where: { email },
  });

  if (!attempt?.lockedUntil) return 0;

  const diffMs = attempt.lockedUntil.getTime() - Date.now();
  const remainingSeconds = Math.ceil(diffMs / 1000);

  if (remainingSeconds > 0) return remainingSeconds;

  await prisma.loginAttempt.deleteMany({ where: { email } });
  return 0;
}

async function registerFailedAttempt(email: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.loginAttempt.findUnique({ where: { email } });

  if (!existing) {
    await prisma.loginAttempt.create({
      data: {
        email,
        failedCount: 1,
        lastFailedAt: now,
      },
    });
    return;
  }

  const nextFailedCount = existing.failedCount + 1;
  const lockedUntil =
    nextFailedCount >= MAX_FAILED_ATTEMPTS
      ? new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60 * 1000)
      : null;

  await prisma.loginAttempt.update({
    where: { email },
    data: {
      failedCount: nextFailedCount,
      lastFailedAt: now,
      lockedUntil,
    },
  });
}

async function clearLoginAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email } });
}

async function ensureTechnologyIdsExist(technologyIds: string[]): Promise<boolean> {
  if (technologyIds.length === 0) return true;

  const total = await prisma.technology.count({
    where: { id: { in: technologyIds } },
  });

  return total === technologyIds.length;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const username = input.username.trim();

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingByEmail) throw new Error("EMAIL_ALREADY_EXISTS");

  const existingByUsername = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existingByUsername) throw new Error("USERNAME_ALREADY_EXISTS");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username,
        role: input.role,
      },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
    throw error;
  }

  const authUserId = data.user?.id;
  if (!authUserId) {
    throw new Error("REGISTER_FAILED");
  }

  try {
    const user = await prisma.user.create({
      data: {
        id: authUserId,
        email,
        username,
        role: input.role,
      },
      select: USER_SELECT,
    });

    return {
      user: mapUser(user),
      accessToken: data.session?.access_token ?? null,
    };
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");

      if (target.includes("email")) throw new Error("EMAIL_ALREADY_EXISTS");
      if (target.includes("username")) throw new Error("USERNAME_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const email = normalizeEmail(input.email);

  const remainingSeconds = await getLockSeconds(email);
  if (remainingSeconds > 0) {
    throw new Error(`TOO_MANY_ATTEMPTS:${remainingSeconds}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error || !data.user || !data.session?.access_token) {
    await registerFailedAttempt(email);
    throw new Error("INVALID_CREDENTIALS");
  }

  await clearLoginAttempts(email);

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: USER_SELECT,
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    user: mapUser(user),
    accessToken: data.session.access_token,
  };
}

export async function logoutUser(_accessToken?: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Logout in JWT flow is best-effort; token expiry enforces session end.
  }
}

export async function getUserById(id: string): Promise<UserWithTechnologiesDto | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_WITH_TECHNOLOGIES_SELECT,
  });

  if (!user) return null;
  const stats = await getUserStats(id);
  return mapUserWithTechnologies(user, stats);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UserWithTechnologiesDto> {
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userExists) throw new Error("USER_NOT_FOUND");

  const uniqueTechnologyIds =
    input.technologyIds !== undefined
      ? Array.from(new Set(input.technologyIds))
      : undefined;

  const normalizedUsername =
    input.username !== undefined ? input.username.trim() : undefined;

  if (normalizedUsername !== undefined) {
    const usernameOwner = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    if (usernameOwner && usernameOwner.id !== userId) {
      throw new Error("USERNAME_ALREADY_EXISTS");
    }
  }

  if (uniqueTechnologyIds !== undefined) {
    const technologiesValid = await ensureTechnologyIdsExist(uniqueTechnologyIds);
    if (!technologiesValid) throw new Error("INVALID_TECHNOLOGIES");
  }

  await prisma.$transaction(async (tx) => {
    const data: Prisma.UserUpdateInput = {};

    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }

    if (normalizedUsername !== undefined) {
      data.username = normalizedUsername;
    }

    if (input.role !== undefined) {
      data.role = input.role;
    }

    if (input.avatarUrl !== undefined) {
      data.avatarUrl = input.avatarUrl?.trim() || null;
    }

    if (Object.keys(data).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data,
      });
    }

    if (uniqueTechnologyIds !== undefined) {
      await tx.userTechnology.deleteMany({ where: { userId } });

      if (uniqueTechnologyIds.length > 0) {
        await tx.userTechnology.createMany({
          data: uniqueTechnologyIds.map((technologyId) => ({
            userId,
            technologyId,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  const updatedUser = await getUserById(userId);
  if (!updatedUser) throw new Error("USER_NOT_FOUND");
  return updatedUser;
}

export async function rateUser(
  raterId: string,
  targetUserId: string,
  input: RateUserInput
): Promise<RateUserResult> {
  if (raterId === targetUserId) {
    throw new Error("SELF_RATING_NOT_ALLOWED");
  }

  const targetExists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!targetExists) throw new Error("USER_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    await tx.userRating.upsert({
      where: {
        raterId_targetUserId: {
          raterId,
          targetUserId,
        },
      },
      create: {
        raterId,
        targetUserId,
        score: input.score,
      },
      update: {
        score: input.score,
      },
    });

    const aggregation = await tx.userRating.aggregate({
      where: { targetUserId },
      _avg: { score: true },
      _count: { score: true },
    });

    const avgRating = Number((aggregation._avg.score ?? 0).toFixed(2));
    const totalRatings = aggregation._count.score;

    await tx.user.update({
      where: { id: targetUserId },
      data: {
        avgRating,
        totalRatings,
      },
    });

    return { avgRating, totalRatings };
  });
}

export async function sendPasswordResetEmail(
  input: ForgotPasswordInput
): Promise<void> {
  const email = normalizeEmail(input.email);
  const supabase = await createSupabaseServerClient();

  // Supabase envía el email con un link de recuperación.
  // redirectTo debe apuntar a la página /reset-password del Frontend.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/reset-password`,
  });
  // Siempre retorna sin error aunque el email no exista (seguridad: no revelar si existe).
}

export async function changeUserPassword(
  userId: string,
  _bearerToken: string,
  input: ChangePasswordInput
): Promise<void> {
  // 1. Obtener el email del usuario desde Prisma.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  // 2. Verificar la contraseña actual re-autenticando con Supabase.
  const supabase = await createSupabaseServerClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  });
  if (signInError || !signInData.session?.access_token) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }

  // 3. Actualizar la contraseña usando el access_token fresco del paso 2.
  //    Se usa la REST API de Supabase directamente para evitar problemas
  //    de persistencia de sesión en el contexto de servidor SSR.
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${signInData.session.access_token}`,
      },
      body: JSON.stringify({ password: input.newPassword }),
    }
  );
  if (!response.ok) throw new Error("PASSWORD_UPDATE_FAILED");
}
