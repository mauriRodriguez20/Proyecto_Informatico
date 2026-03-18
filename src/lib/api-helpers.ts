import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export type AuthResult =
  | { userId: string; errorResponse: null }
  | { userId: null; errorResponse: NextResponse };

// ─────────────────────────────────────────────────────────────
// withAuth
// Extrae el userId autenticado de un request protegido.
// Uso en route handlers:
//
//   const { userId, errorResponse } = await withAuth(req);
//   if (errorResponse) return errorResponse;
// ─────────────────────────────────────────────────────────────

export async function withAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { error: "Token de autenticación requerido." },
        { status: 401 }
      ),
    };
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
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

  if (!user) {
    return {
      userId: null,
      errorResponse: NextResponse.json(
        { error: "No autorizado. Sesión inválida o expirada." },
        { status: 401 }
      ),
    };
  }

  return { userId: user.id, errorResponse: null };
}
