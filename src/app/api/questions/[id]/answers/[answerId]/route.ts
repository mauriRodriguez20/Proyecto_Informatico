import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  updateAnswerSchema,
  uuidParamSchema,
} from "@/modules/questions/questions.schema";
import { deleteAnswer, updateAnswer } from "@/modules/questions/questions.service";
import type { ErrorResponse } from "@/modules/questions/questions.types";

function getFirstFieldError(details: Record<string, string[] | undefined>): string | undefined {
  const first = Object.values(details).find((messages) => messages && messages.length > 0);
  return first?.[0];
}

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

    const body = await req.json();
    const validation = updateAnswerSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Datos de actualizacion invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const answer = await updateAnswer(
      questionIdValidation.data,
      answerIdValidation.data,
      userId,
      validation.data
    );

    return NextResponse.json(
      {
        message: "Respuesta actualizada exitosamente.",
        answer,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "ANSWER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Respuesta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "FORBIDDEN_ANSWER_EDIT") {
      const response: ErrorResponse = {
        error: "No tienes permiso para editar esta respuesta.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    if (err.message === "INVALID_LANGUAGE_WITHOUT_CODE") {
      const response: ErrorResponse = {
        error: "No puedes definir lenguaje sin bloque de codigo.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error("[PATCH /api/questions/:id/answers/:answerId]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
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

    const result = await deleteAnswer(
      questionIdValidation.data,
      answerIdValidation.data,
      userId
    );

    return NextResponse.json(
      {
        message: "Respuesta eliminada exitosamente.",
        deletedAnswerId: result.deletedAnswerId,
        wasAccepted: result.wasAccepted,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "ANSWER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Respuesta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "FORBIDDEN_ANSWER_DELETE") {
      const response: ErrorResponse = {
        error: "No tienes permiso para eliminar esta respuesta.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error("[DELETE /api/questions/:id/answers/:answerId]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
