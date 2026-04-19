import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { uuidParamSchema } from "@/modules/interactions/interactions.schema";
import { createAcceptedAnswerNotification } from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

export async function POST(
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

    const notification = await createAcceptedAnswerNotification(
      questionIdValidation.data,
      answerIdValidation.data,
      userId
    );

    if (!notification) {
      return NextResponse.json(
        { message: "No se genero notificacion porque la respuesta pertenece al mismo autor." },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Notificacion de respuesta aceptada generada exitosamente.",
        notification,
      },
      { status: 201 }
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

    if (err.message === "ANSWER_QUESTION_MISMATCH") {
      const response: ErrorResponse = {
        error: "La respuesta no pertenece a la pregunta indicada.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (err.message === "FORBIDDEN_ACCEPT_NOTIFICATION") {
      const response: ErrorResponse = {
        error: "Solo el autor de la pregunta puede generar esta notificacion.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error("[POST /api/questions/:id/answers/:answerId/accepted-notification]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
