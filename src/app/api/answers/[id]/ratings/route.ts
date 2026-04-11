import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  rateTargetSchema,
  uuidParamSchema,
} from "@/modules/interactions/interactions.schema";
import {
  getAnswerRatingSummary,
  rateAnswer,
} from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

function getFirstFieldError(details: Record<string, string[] | undefined>): string | undefined {
  const first = Object.values(details).find((messages) => messages && messages.length > 0);
  return first?.[0];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idValidation = uuidParamSchema.safeParse(id);

    if (!idValidation.success) {
      const response: ErrorResponse = { error: "El id de la respuesta no es valido." };
      return NextResponse.json(response, { status: 400 });
    }

    const rating = await getAnswerRatingSummary(idValidation.data);
    return NextResponse.json({ rating }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "ANSWER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Respuesta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    console.error("[GET /api/answers/:id/ratings]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
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
      const response: ErrorResponse = { error: "El id de la respuesta no es valido." };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await req.json();
    const validation = rateTargetSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Datos de calificacion invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await rateAnswer(idValidation.data, userId, validation.data);

    return NextResponse.json(
      {
        message: "Calificacion registrada exitosamente.",
        rating: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "ANSWER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Respuesta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "SELF_RATING_NOT_ALLOWED") {
      const response: ErrorResponse = {
        error: "No puedes calificar tu propio contenido.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error("[POST /api/answers/:id/ratings]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
