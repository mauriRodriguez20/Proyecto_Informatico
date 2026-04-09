import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PREFIX_ROUTES = ["/api/users/register", "/api/users/login"];

function isPublicRoute(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIX_ROUTES.some((route) => pathname.startsWith(route))) {
    return true;
  }

  if (req.method === "GET" && /^\/api\/users\/[^/]+$/.test(pathname)) {
    return true;
  }

  if (req.method === "GET" && pathname.startsWith("/api/technologies")) {
    return true;
  }

  return false;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- CORS Handling ---
  const allowedOrigins = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ];
  const origin = req.headers.get("origin");
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin) {
      res.headers.set("Access-Control-Allow-Origin", origin);
    }
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res;
  }

  let res: NextResponse;

  if (isPublicRoute(req)) {
    res = NextResponse.next();
  } else if (!pathname.startsWith("/api")) {
    res = NextResponse.next();
  } else {
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
          setAll(
            cookiesToSet: { name: string; value: string; options: CookieOptions }[]
          ) {
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
    } else {
      res = NextResponse.next();
    }
  }

  if (isAllowedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
