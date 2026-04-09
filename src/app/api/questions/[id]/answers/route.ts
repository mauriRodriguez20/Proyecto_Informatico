import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  createAnswerSchema,
  uuidParamSchema,
} from "@/modules/questions/questions.schema";
import { createAnswer } from "@/modules/questions/questions.service";
import type { ErrorResponse } from "@/modules/questions/questions.types";

function getFirstFieldError(details: Record<string, string[] | undefined>): string | undefined {
  const first = Object.values(details).find((messages) => messages && messages.length > 0);
  return first?.[0];
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const idValidation = uuidParamSchema.safeParse(id);
    if (!idValidation.success) {
      const response: ErrorResponse = { error: "El id de la pregunta no es valido." };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await req.json();
    const validation = createAnswerSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Datos de respuesta invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const answer = await createAnswer(idValidation.data, userId, validation.data);

    return NextResponse.json(
      {
        message: "Respuesta publicada exitosamente.",
        answer,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "QUESTION_NOT_FOUND") {
      const response: ErrorResponse = { error: "Pregunta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    console.error("[POST /api/questions/:id/answers]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
