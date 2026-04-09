import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Rutas publicas que no requieren auth en middleware.
// Los endpoints protegidos siguen usando withAuth dentro de los route handlers.
const PUBLIC_ROUTES = ["/api/questions"];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

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
    return NextResponse.json(
      { error: "No autorizado. Debes iniciar sesion." },
      { status: 401 }
    );
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};

