import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/shared/users.schema";
import { loginUser } from "@/server/users/users.service";
import type { ErrorResponse } from "@/shared/users.types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            const response: ErrorResponse = {
                error: "Datos de inicio de sesion invalidos.",
                details: validation.error.errors[0].message,
            };
            return NextResponse.json(response, { status: 400 });
        }

        const { user, accessToken } = await loginUser(validation.data);

        return NextResponse.json(
            {
                message: "Inicio de sesion exitoso.",
                user,
                accessToken,
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        const err = error as Error;

        if (err.message.startsWith("TOO_MANY_ATTEMPTS:")) {
            const seconds = Number(err.message.split(":")[1] ?? "0");
            const minutes = Math.max(1, Math.ceil(seconds / 60));
            const response: ErrorResponse = {
                error: `Demasiados intentos fallidos. Intenta nuevamente en ${minutes} minuto(s).`,
            };
            return NextResponse.json(response, { status: 429 });
        }

        if (err.message === "INVALID_CREDENTIALS") {
            const response: ErrorResponse = {
                error: "Credenciales incorrectas. Verifica tu email y contrasena.",
            };
            return NextResponse.json(response, { status: 401 });
        }

        if (err.message === "USER_NOT_FOUND") {
            const response: ErrorResponse = {
                error: "Credenciales incorrectas. Verifica tu email y contrasena.",
            };
            return NextResponse.json(response, { status: 401 });
        }

        console.error("[POST /api/users/login]", err.message);
        const response: ErrorResponse = { error: "Error interno del servidor." };
        return NextResponse.json(response, { status: 500 });
    }
}
