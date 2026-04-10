import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/modules/users/users.schema";
import { sendPasswordResetEmail } from "@/modules/users/users.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = forgotPasswordSchema.safeParse(body);
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

    await sendPasswordResetEmail(validation.data);

    // Siempre responde 200 aunque el email no exista (no revelar si existe).
    return NextResponse.json(
      {
        message:
          "Si el correo esta registrado, recibiras un enlace de recuperacion en los proximos minutos.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[POST /api/users/forgot-password]", err.message);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
