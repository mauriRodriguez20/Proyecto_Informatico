import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  uuidParamSchema,
  voteAnswerSchema,
} from "@/modules/questions/questions.schema";
import { voteAnswer } from "@/modules/questions/questions.service";
import type { ErrorResponse } from "@/modules/questions/questions.types";

function getFirstFieldError(details: Record<string, string[] | undefined>): string | undefined {
  const first = Object.values(details).find((messages) => messages && messages.length > 0);
  return first?.[0];
}

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

    const body = await req.json();
    const validation = voteAnswerSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Datos de voto invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await voteAnswer(
      questionIdValidation.data,
      answerIdValidation.data,
      userId,
      validation.data.value
    );

    return NextResponse.json(
      {
        message: "Voto registrado exitosamente.",
        voteScore: result.voteScore,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "ANSWER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Respuesta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "SELF_VOTE_NOT_ALLOWED") {
      const response: ErrorResponse = {
        error: "No puedes votar tu propia respuesta.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error("[POST /api/questions/:id/answers/:answerId/vote]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
