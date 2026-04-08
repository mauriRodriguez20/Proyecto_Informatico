import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/modules/users/users.service";
import type { ErrorResponse } from "@/modules/users/users.types";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const accessToken = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : undefined;

        await logoutUser(accessToken);
        return NextResponse.json({ message: "Sesión cerrada exitosamente." }, { status: 200 });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[POST /api/users/logout]", err.message);
        return NextResponse.json({ error: "Error al cerrar la sesión." }, { status: 500 });
    }
}