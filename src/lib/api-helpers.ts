import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export type AuthResult =
  | { userId: string; errorResponse: null }
  | { userId: null; errorResponse: NextResponse };

export type OptionalAuthResult = { userId: string | null };

function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

async function resolveUserId(req: NextRequest, token: string): Promise<string | null> {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user?.id ?? null;
}

export async function withAuth(req: NextRequest): Promise<AuthResult> {
  const token = getBearerToken(req);

  if (!token) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { error: "Token de autenticacion requerido." },
        { status: 401 }
      ),
    };
  }

  const userId = await resolveUserId(req, token);

  if (!userId) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { error: "No autorizado. Sesion invalida o expirada." },
        { status: 401 }
      ),
    };
  }

  return { userId, errorResponse: null };
}

export async function withOptionalAuth(req: NextRequest): Promise<OptionalAuthResult> {
  const token = getBearerToken(req);
  if (!token) return { userId: null };

  try {
    const userId = await resolveUserId(req, token);
    return { userId };
  } catch {
    return { userId: null };
  }
}