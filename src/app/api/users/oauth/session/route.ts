import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { syncOAuthUserSession } from "@/modules/users/users.service";
import type { ErrorResponse } from "@/modules/users/users.types";

export async function POST(req: NextRequest) {
  try {
    const { authUser, bearerToken, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;
    if (!authUser || !bearerToken) {
      const response: ErrorResponse = { error: "No autorizado." };
      return NextResponse.json(response, { status: 401 });
    }

    const user = await syncOAuthUserSession(authUser);

    return NextResponse.json(
      {
        message: "Sesion OAuth sincronizada exitosamente.",
        user,
        token: bearerToken,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "OAUTH_EMAIL_REQUIRED") {
      const response: ErrorResponse = {
        error:
          "No fue posible obtener un correo electronico desde el proveedor OAuth.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (err.message === "OAUTH_EMAIL_CONFLICT") {
      const response: ErrorResponse = {
        error:
          "El correo del proveedor OAuth ya esta asociado a otra cuenta.",
      };
      return NextResponse.json(response, { status: 409 });
    }

    console.error("[POST /api/users/oauth/session]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
