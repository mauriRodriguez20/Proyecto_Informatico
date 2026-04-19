import { NextRequest, NextResponse } from "next/server";
import { uuidParamSchema } from "@/modules/interactions/interactions.schema";
import { getUserPublicStats } from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idValidation = uuidParamSchema.safeParse(id);

    if (!idValidation.success) {
      const response: ErrorResponse = { error: "El id del usuario no es valido." };
      return NextResponse.json(response, { status: 400 });
    }

    const stats = await getUserPublicStats(idValidation.data);
    return NextResponse.json({ stats }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "USER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Usuario no encontrado." };
      return NextResponse.json(response, { status: 404 });
    }

    console.error("[GET /api/users/:id/stats]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
