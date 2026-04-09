import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Rutas públicas que NO requieren autenticación
const PUBLIC_ROUTES = [
  "/api/publications",  // GET (listado y detalle) son públicos; POST/PATCH/DELETE son protegidos por withAuth
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Permitir rutas públicas sin verificación
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 2. Solo proteger rutas /api/**
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // 3. Extraer el Bearer token del header Authorization
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // 4. Crear cliente Supabase SSR con soporte de cookies
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

  // 5. Verificar el token con Supabase Auth
  const {
    data: { user },
    error
  } = await supabase.auth.getUser(bearerToken ?? undefined);

  if (error || !user) {
    console.error("[Middleware] Auth failed. Error:", error?.message);
    return NextResponse.json(
      { error: "No autorizado. Debes iniciar sesión." },
      { status: 401 }
    );
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
