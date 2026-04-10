import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { changePasswordSchema } from "@/modules/users/users.schema";
import { changeUserPassword } from "@/modules/users/users.service";

export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const bearerToken = req.headers.get("authorization")!.slice(7);

    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).find(
        (msgs) => msgs && msgs.length > 0
      )?.[0];
      return NextResponse.json(
        { error: firstError ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    await changeUserPassword(userId, bearerToken, validation.data);

    return NextResponse.json(
      { message: "Contrasena actualizada exitosamente." },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "INVALID_CURRENT_PASSWORD") {
      return NextResponse.json(
        { error: "La contrasena actual es incorrecta." },
        { status: 400 }
      );
    }
    if (err.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }
    if (err.message === "PASSWORD_UPDATE_FAILED") {
      return NextResponse.json(
        { error: "No se pudo actualizar la contrasena. Intenta de nuevo." },
        { status: 500 }
      );
    }

    console.error("[POST /api/users/change-password]", err.message);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
