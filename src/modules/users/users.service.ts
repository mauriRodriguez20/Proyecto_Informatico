import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  RateUserInput,
} from "./users.schema";
import type { UserProfile, UserPublicProfile } from "./users.types";

// ─────────────────────────────────────────────────────────────
// Selectores reutilizables
// ─────────────────────────────────────────────────────────────

const USER_PROFILE_SELECT = {
  id:           true,
  email:        true,
  username:     true,
  role:         true,
  avatarUrl:    true,
  description:  true,
  avgRating:    true,
  totalRatings: true,
  createdAt:    true,
} as const;

const USER_PUBLIC_SELECT = {
  ...USER_PROFILE_SELECT,
  technologies: {
    select: {
      technology: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────
// HU-004: Registro
// ─────────────────────────────────────────────────────────────

export async function registerUser(data: RegisterInput): Promise<UserProfile> {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email:    data.email,
    password: data.password,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already registered")) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error("No se pudo crear el usuario. Intenta de nuevo.");
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (existingUsername) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error("USERNAME_ALREADY_EXISTS");
  }

  const user = await prisma.user.create({
    data: {
      id:       authData.user.id,
      email:    data.email,
      username: data.username,
      role:     data.role,
    },
    select: USER_PROFILE_SELECT,
  });

  return user;
}

// ─────────────────────────────────────────────────────────────
// HU-005: Inicio de sesión
// ─────────────────────────────────────────────────────────────

export async function loginUser(
  data: LoginInput
): Promise<{ user: UserProfile; accessToken: string }> {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    });

  if (authError) throw new Error("INVALID_CREDENTIALS");
  if (!authData.user || !authData.session) throw new Error("INVALID_CREDENTIALS");

  const user = await prisma.user.findUnique({
    where:  { id: authData.user.id },
    select: USER_PROFILE_SELECT,
  });

  if (!user) throw new Error("USER_NOT_FOUND");

  return {
    user,
    accessToken: authData.session.access_token,
  };
}

// ─────────────────────────────────────────────────────────────
// HU-006: Cierre de sesión
// ─────────────────────────────────────────────────────────────

export async function logoutUser(accessToken?: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (accessToken) {
    await supabase.auth.setSession({
      access_token:  accessToken,
      refresh_token: "",
    });
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("No se pudo cerrar la sesión. Intenta de nuevo.");
  }
}

// ─────────────────────────────────────────────────────────────
// HU-007: Ver perfil (propio o público)
// ─────────────────────────────────────────────────────────────

export async function getUserById(
  id: string
): Promise<UserPublicProfile | null> {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: USER_PUBLIC_SELECT,
  });

  if (!user) return null;

  // Aplanar la relación UserTechnology para devolver tecnologías directamente
  return {
    ...user,
    technologies: user.technologies.map((ut) => ut.technology),
  };
}

// ─────────────────────────────────────────────────────────────
// HU-008: Editar perfil
// ─────────────────────────────────────────────────────────────

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<UserPublicProfile> {
  const { technologies, ...profileFields } = data;

  // Verificar que el usuario existe antes de operar
  const exists = await prisma.user.findUnique({ where: { id: userId } });
  if (!exists) throw new Error("USER_NOT_FOUND");

  // Si se enviaron tecnologías, verificar que todas existen en la DB
  if (technologies && technologies.length > 0) {
    const count = await prisma.technology.count({
      where: { id: { in: technologies } },
    });
    if (count !== technologies.length) {
      throw new Error("INVALID_TECHNOLOGIES");
    }
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    // 1. Actualizar campos básicos del perfil
    const user = await tx.user.update({
      where:  { id: userId },
      data:   profileFields,
      select: USER_PUBLIC_SELECT,
    });

    // 2. Si se enviaron tecnologías, reemplazar las existentes
    if (technologies !== undefined) {
      await tx.userTechnology.deleteMany({ where: { userId } });

      if (technologies.length > 0) {
        await tx.userTechnology.createMany({
          data: technologies.map((technologyId) => ({
            userId,
            technologyId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return user;
  });

  // Re-leer el usuario para incluir las tecnologías actualizadas
  const refreshed = await prisma.user.findUnique({
    where:  { id: userId },
    select: USER_PUBLIC_SELECT,
  });

  return {
    ...refreshed!,
    technologies: refreshed!.technologies.map((ut) => ut.technology),
  };
}

// ─────────────────────────────────────────────────────────────
// HU-009: Calificación de usuario
// ─────────────────────────────────────────────────────────────

export async function rateUser(
  raterId: string,
  targetUserId: string,
  data: RateUserInput
): Promise<{ avgRating: number; totalRatings: number }> {
  if (raterId === targetUserId) {
    throw new Error("SELF_RATING_NOT_ALLOWED");
  }

  // Verificar que el usuario a calificar existe
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new Error("USER_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    // 1. Upsert del rating (crear o actualizar si ya existe)
    await tx.userRating.upsert({
      where: {
        raterId_targetUserId: { raterId, targetUserId },
      },
      create: { raterId, targetUserId, score: data.score },
      update: { score: data.score },
    });

    // 2. Recalcular promedio con todos los ratings del usuario target
    const allRatings = await tx.userRating.findMany({
      where: { targetUserId },
    });

    const total = allRatings.length;
    const avg   = allRatings.reduce((sum, r) => sum + r.score, 0) / total;
    const rounded = Math.round(avg * 10) / 10; // Redondear a 1 decimal

    // 3. Actualizar avgRating y totalRatings del usuario
    await tx.user.update({
      where: { id: targetUserId },
      data:  { avgRating: rounded, totalRatings: total },
    });

    return { avgRating: rounded, totalRatings: total };
  });
}

// ─────────────────────────────────────────────────────────────
// Sesión actual (helper interno)
// ─────────────────────────────────────────────────────────────

export async function getAuthenticatedUser(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  return prisma.user.findUnique({
    where:  { id: authUser.id },
    select: USER_PROFILE_SELECT,
  });
}
