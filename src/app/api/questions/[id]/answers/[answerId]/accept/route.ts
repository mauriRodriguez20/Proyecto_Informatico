import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { uuidParamSchema } from "@/modules/questions/questions.schema";
import { acceptAnswer } from "@/modules/questions/questions.service";
import type { ErrorResponse } from "@/modules/questions/questions.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; answerId: string }> }
) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const { id, answerId } = await params;

    const questionIdValidation = uuidParamSchema.safeParse(id);
    const answerIdValidation = uuidParamSchema.safeParse(answerId);

    if (!questionIdValidation.success || !answerIdValidation.success) {
      const response: ErrorResponse = {
        error: "Los identificadores de pregunta o respuesta no son validos.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const answer = await acceptAnswer(
      questionIdValidation.data,
      answerIdValidation.data,
      userId
    );

    return NextResponse.json(
      {
        message: "Respuesta marcada como aceptada.",
        answer,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "QUESTION_NOT_FOUND") {
      const response: ErrorResponse = { error: "Pregunta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "ANSWER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Respuesta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "FORBIDDEN_ACCEPT_ANSWER") {
      const response: ErrorResponse = {
        error: "Solo el autor de la pregunta puede aceptar una respuesta.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error("[PATCH /api/questions/:id/answers/:answerId/accept]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
