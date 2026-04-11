import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  createCommentSchema,
  listCommentsQuerySchema,
  uuidParamSchema,
} from "@/modules/interactions/interactions.schema";
import {
  createQuestionComment,
  listQuestionComments,
} from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

function getFirstFieldError(details: Record<string, string[] | undefined>): string | undefined {
  const first = Object.values(details).find((messages) => messages && messages.length > 0);
  return first?.[0];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idValidation = uuidParamSchema.safeParse(id);

    if (!idValidation.success) {
      const response: ErrorResponse = { error: "El id de la pregunta no es valido." };
      return NextResponse.json(response, { status: 400 });
    }

    const validation = listCommentsQuerySchema.safeParse({
      page: req.nextUrl.searchParams.get("page") ?? "1",
      limit: req.nextUrl.searchParams.get("limit") ?? "10",
    });

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Parametros de consulta invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await listQuestionComments(idValidation.data, validation.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "QUESTION_NOT_FOUND") {
      const response: ErrorResponse = { error: "Pregunta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    console.error("[GET /api/questions/:id/comments]", err.message);
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
      const response: ErrorResponse = { error: "El id de la pregunta no es valido." };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await req.json();
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Datos de comentario invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const comment = await createQuestionComment(idValidation.data, userId, validation.data);

    return NextResponse.json(comment, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "QUESTION_NOT_FOUND") {
      const response: ErrorResponse = { error: "Pregunta no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    console.error("[POST /api/questions/:id/comments]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
