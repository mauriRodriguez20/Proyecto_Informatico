import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RegisterInput, LoginInput } from "./users.schema";
import type { UserProfile } from "./users.types";
export async function registerUser(data: RegisterInput): Promise<UserProfile> {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
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
    select: {
      id:          true,
      email:       true,
      username:    true,
      role:        true,
      avatarUrl:   true,
      description: true,
      avgRating:   true,
      totalRatings:true,
      createdAt:   true,
    },
  });

  return user;
}

export async function loginUser(
  data: LoginInput
): Promise<{ user: UserProfile; accessToken: string }> {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    });

  if (authError) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!authData.user || !authData.session) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user = await prisma.user.findUnique({
    where: { id: authData.user.id },
    select: {
      id:           true,
      email:        true,
      username:     true,
      role:         true,
      avatarUrl:    true,
      description:  true,
      avgRating:    true,
      totalRatings: true,
      createdAt:    true,
    },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

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
    throw new Error("No se pudo cerrar la sesión. Intenta de nuevo.");
  }
}


export async function getAuthenticatedUser(): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id:           true,
      email:        true,
      username:     true,
      role:         true,
      avatarUrl:    true,
      description:  true,
      avgRating:    true,
      totalRatings: true,
      createdAt:    true,
    },
  });

  return user;
}
