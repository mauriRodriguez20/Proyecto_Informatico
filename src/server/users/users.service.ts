import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
    RegisterInput,
    LoginInput,
    UpdateProfileInput,
    RateUserInput,
} from "./users.schema";
import type { UserProfile, UserPublicProfile, UserStats } from "./users.types";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;

const USER_PROFILE_SELECT = {
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

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function buildTooManyAttemptsError(lockedUntil: Date): Error {
    const seconds = Math.max(
        1,
        Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
    );
    return new Error(`TOO_MANY_ATTEMPTS:${seconds}`);
}

async function validateLoginLock(email: string): Promise<void> {
    const attempt = await prisma.loginAttempt.findUnique({ where: { email } });
    if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
        throw buildTooManyAttemptsError(attempt.lockedUntil);
    }
}

async function recordFailedLogin(email: string): Promise<void> {
    const now = new Date();
    const current = await prisma.loginAttempt.findUnique({ where: { email } });
    const nextCount = (current?.failedCount ?? 0) + 1;
    const lockedUntil =
        nextCount >= MAX_LOGIN_ATTEMPTS
            ? new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60 * 1000)
            : null;

    await prisma.loginAttempt.upsert({
        where: { email },
        update: {
            failedCount: nextCount,
            lastFailedAt: now,
            lockedUntil,
        },
        create: {
            email,
            failedCount: nextCount,
            lastFailedAt: now,
            lockedUntil,
        },
    });
}

async function clearLoginAttempts(email: string): Promise<void> {
    try {
        await prisma.loginAttempt.delete({ where: { email } });
    } catch {
        // No-op when there is no previous attempt record.
    }
}

interface PublicationMetrics {
    publications: number;
    avgRating: number;
    totalRatings: number;
}

async function getPublicationMetricsForUser(
    userId: string
): Promise<PublicationMetrics> {
    const ms02Url = process.env.MS02_URL;
    if (!ms02Url) {
        return { publications: 0, avgRating: 0, totalRatings: 0 };
    }

    try {
        const response = await fetch(
            `${ms02Url}/api/publications?authorId=${userId}&page=1&limit=1`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            return { publications: 0, avgRating: 0, totalRatings: 0 };
        }

        const payload = await response.json();
        const publications = typeof payload?.total === "number" ? payload.total : 0;
        const avgRating =
            typeof payload?.summary?.avgRating === "number"
                ? payload.summary.avgRating
                : 0;
        const totalRatings =
            typeof payload?.summary?.totalRatings === "number"
                ? payload.summary.totalRatings
                : 0;

        return { publications, avgRating, totalRatings };
    } catch {
        return { publications: 0, avgRating: 0, totalRatings: 0 };
    }
}

function buildUserStats(publications: number): UserStats {
    return {
        publications,
        questions: 0,
        answers: 0,
    };
}

function toPublicProfile(
    user: {
        id: string;
        email: string;
        username: string;
        role: "FRONTEND" | "BACKEND";
        avatarUrl: string | null;
        description: string | null;
        avgRating: number;
        totalRatings: number;
        createdAt: Date;
        technologies: { technology: { id: string; name: string; slug: string } }[];
    },
    stats: UserStats,
    ratingOverride?: { avgRating: number; totalRatings: number }
): UserPublicProfile {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        description: user.description,
        avgRating: ratingOverride?.avgRating ?? user.avgRating,
        totalRatings: ratingOverride?.totalRatings ?? user.totalRatings,
        createdAt: user.createdAt,
        technologies: user.technologies.map((ut) => ut.technology),
        stats,
    };
}

export async function registerUser(data: RegisterInput): Promise<UserProfile> {
    const supabase = await createSupabaseServerClient();
    const email = normalizeEmail(data.email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
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
            id: authData.user.id,
            email,
            username: data.username,
            role: data.role,
        },
        select: USER_PROFILE_SELECT,
    });

    return user;
}

export async function loginUser(
    data: LoginInput
): Promise<{ user: UserProfile; accessToken: string }> {
    const supabase = await createSupabaseServerClient();
    const email = normalizeEmail(data.email);

    await validateLoginLock(email);

    const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
            email,
            password: data.password,
        });

    if (authError || !authData.user || !authData.session) {
        await recordFailedLogin(email);
        throw new Error("INVALID_CREDENTIALS");
    }

    await clearLoginAttempts(email);

    const user = await prisma.user.findUnique({
        where: { id: authData.user.id },
        select: USER_PROFILE_SELECT,
    });

    if (!user) throw new Error("USER_NOT_FOUND");

    return {
        user,
        accessToken: authData.session.access_token,
    };
}

export async function logoutUser(accessToken?: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    if (accessToken) {
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: "",
        });
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
        throw new Error("No se pudo cerrar la sesion. Intenta de nuevo.");
    }
}

export async function getUserById(id: string): Promise<UserPublicProfile | null> {
    const user = await prisma.user.findUnique({
        where: { id },
        select: USER_PUBLIC_SELECT,
    });

    if (!user) return null;

    const publicationMetrics = await getPublicationMetricsForUser(id);
    const stats = buildUserStats(publicationMetrics.publications);
    const ratingOverride =
        publicationMetrics.totalRatings > 0
            ? {
                avgRating: publicationMetrics.avgRating,
                totalRatings: publicationMetrics.totalRatings,
            }
            : undefined;

    return toPublicProfile(user, stats, ratingOverride);
}

export async function updateUserProfile(
    userId: string,
    data: UpdateProfileInput
): Promise<UserPublicProfile> {
    const {
        technologies,
        avatarFileSizeBytes: _avatarFileSizeBytes,
        ...profileFields
    } = data;

    const exists = await prisma.user.findUnique({ where: { id: userId } });
    if (!exists) throw new Error("USER_NOT_FOUND");

    if (technologies && technologies.length > 0) {
        const count = await prisma.technology.count({
            where: { id: { in: technologies } },
        });
        if (count !== technologies.length) {
            throw new Error("INVALID_TECHNOLOGIES");
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: profileFields,
            select: USER_PUBLIC_SELECT,
        });

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
    });

    const refreshed = await prisma.user.findUnique({
        where: { id: userId },
        select: USER_PUBLIC_SELECT,
    });

    const publicationMetrics = await getPublicationMetricsForUser(userId);
    const stats = buildUserStats(publicationMetrics.publications);
    const ratingOverride =
        publicationMetrics.totalRatings > 0
            ? {
                avgRating: publicationMetrics.avgRating,
                totalRatings: publicationMetrics.totalRatings,
            }
            : undefined;

    return toPublicProfile(refreshed!, stats, ratingOverride);
}

export async function rateUser(
    raterId: string,
    targetUserId: string,
    data: RateUserInput
): Promise<{ avgRating: number; totalRatings: number }> {
    if (raterId === targetUserId) {
        throw new Error("SELF_RATING_NOT_ALLOWED");
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new Error("USER_NOT_FOUND");

    return prisma.$transaction(async (tx) => {
        await tx.userRating.upsert({
            where: {
                raterId_targetUserId: { raterId, targetUserId },
            },
            create: { raterId, targetUserId, score: data.score },
            update: { score: data.score },
        });

        const allRatings = await tx.userRating.findMany({
            where: { targetUserId },
        });

        const total = allRatings.length;
        const avg = allRatings.reduce((sum, r) => sum + r.score, 0) / total;
        const rounded = Math.round(avg * 10) / 10;

        await tx.user.update({
            where: { id: targetUserId },
            data: { avgRating: rounded, totalRatings: total },
        });

        return { avgRating: rounded, totalRatings: total };
    });
}

export async function getAuthenticatedUser(): Promise<UserProfile | null> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return null;

    return prisma.user.findUnique({
        where: { id: authUser.id },
        select: USER_PROFILE_SELECT,
    });
}
