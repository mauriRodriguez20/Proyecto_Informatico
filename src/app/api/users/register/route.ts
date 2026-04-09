import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/shared/users.schema";
import { registerUser } from "@/server/users/users.service";
import type { ErrorResponse } from "@/shared/users.types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            const response: ErrorResponse = {
                error: "Datos de registro inválidos.",
                details: validation.error.errors[0].message,
            };
            return NextResponse.json(response, { status: 400 });
        }

        const user = await registerUser(validation.data);

        return NextResponse.json(
            {
                message: "Usuario registrado exitosamente.",
                user,
            },
            { status: 201 }
        );

    } catch (error: unknown) {
        const err = error as Error;

        if (err.message === "EMAIL_ALREADY_EXISTS") {
            const response: ErrorResponse = {
                error: "El correo electrónico ya está registrado.",
            };
            return NextResponse.json(response, { status: 409 });
        }

        if (err.message === "USERNAME_ALREADY_EXISTS") {
            const response: ErrorResponse = {
                error: "El nombre de usuario ya está en uso.",
            };
            return NextResponse.json(response, { status: 409 });
        }

        console.error("[POST /api/users/register]", err.message);
        const response: ErrorResponse = { error: "Error interno del servidor." };
        return NextResponse.json(response, { status: 500 });
    }
}
