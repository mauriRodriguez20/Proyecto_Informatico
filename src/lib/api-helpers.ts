import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export interface AuthenticatedUserSnapshot {
  id: string;
  email: string | null;
  userMetadata: Record<string, unknown> | null;
}

export type AuthResult =
  | {
      userId: string;
      authUser: AuthenticatedUserSnapshot;
      bearerToken: string;
      errorResponse: null;
    }
  | {
      userId: null;
      authUser: null;
      bearerToken: null;
      errorResponse: NextResponse;
    };

const MAX_TOKEN_AGE_SECONDS = 24 * 60 * 60;

function parseJwtPayload(token: string): { iat?: number; exp?: number } | null {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );

    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpiredByPolicy(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp === "number" && now > payload.exp) {
    return true;
  }

  if (typeof payload.iat === "number" && now - payload.iat > MAX_TOKEN_AGE_SECONDS) {
    return true;
  }

  return false;
}

export async function withAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return {
      userId: null,
      authUser: null,
      bearerToken: null,
      errorResponse: NextResponse.json(
        { error: "Token de autenticacion requerido." },
        { status: 401 }
      ),
    };
  }

  if (isTokenExpiredByPolicy(token)) {
    return {
      userId: null,
      authUser: null,
      bearerToken: null,
      errorResponse: NextResponse.json(
        { error: "No autorizado. La sesion expiro (maximo 24 horas)." },
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
      authUser: null,
      bearerToken: null,
      errorResponse: NextResponse.json(
        { error: "No autorizado. Sesion invalida o expirada." },
        { status: 401 }
      ),
    };
  }

  return {
    userId: user.id,
    authUser: {
      id: user.id,
      email: user.email ?? null,
      userMetadata:
        user.user_metadata && typeof user.user_metadata === "object"
          ? (user.user_metadata as Record<string, unknown>)
          : null,
    },
    bearerToken: token,
    errorResponse: null,
  };
}
