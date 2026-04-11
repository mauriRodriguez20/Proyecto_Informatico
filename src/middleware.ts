import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Public routes that do not require auth in middleware.
// Protected endpoints still use withAuth inside route handlers.
const PUBLIC_ROUTES = ["/api/publications", "/api/questions", "/api/answers"];

function resolveAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return configured;
  }

  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}

function applyCorsHeaders(res: NextResponse, req: NextRequest): void {
  const allowedOrigins = resolveAllowedOrigins();
  const origin = req.headers.get("origin");
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  if (isAllowedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }

  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    applyCorsHeaders(res, req);
    return res;
  }

  let res: NextResponse;

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    res = NextResponse.next();
    applyCorsHeaders(res, req);
    return res;
  }

  if (!pathname.startsWith("/api")) {
    res = NextResponse.next();
    applyCorsHeaders(res, req);
    return res;
  }

  res = NextResponse.next();

  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

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
      global: bearerToken
        ? { headers: { Authorization: `Bearer ${bearerToken}` } }
        : undefined,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken ?? undefined);

  if (!user) {
    res = NextResponse.json(
      { error: "No autorizado. Debes iniciar sesion." },
      { status: 401 }
    );
    applyCorsHeaders(res, req);
    return res;
  }

  applyCorsHeaders(res, req);
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
