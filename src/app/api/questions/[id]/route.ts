import { NextRequest, NextResponse } from "next/server";
import { withOptionalAuth } from "@/lib/api-helpers";
import { uuidParamSchema } from "@/modules/questions/questions.schema";
import { getQuestionById } from "@/modules/questions/questions.service";
import type { ErrorResponse } from "@/modules/questions/questions.types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const idValidation = uuidParamSchema.safeParse(id);
    if (!idValidation.success) {
      const response: ErrorResponse = {
        error: "El id de la pregunta no es valido.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { userId } = await withOptionalAuth(_req);

    const question = await getQuestionById(idValidation.data, userId);

    if (!question) {
      const response: ErrorResponse = { error: "Pregunta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    return NextResponse.json({ question }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[GET /api/questions/:id]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
