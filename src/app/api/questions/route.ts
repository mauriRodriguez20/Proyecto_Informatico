import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  createQuestionSchema,
  listQuestionsQuerySchema,
} from "@/modules/questions/questions.schema";
import {
  createQuestion,
  listQuestions,
} from "@/modules/questions/questions.service";
import type { ErrorResponse } from "@/modules/questions/questions.types";

function getFirstFieldError(details: Record<string, string[] | undefined>): string | undefined {
  const first = Object.values(details).find((messages) => messages && messages.length > 0);
  return first?.[0];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const validation = listQuestionsQuerySchema.safeParse({
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "10",
      unanswered: searchParams.get("unanswered") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Parametros de consulta invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await listQuestions(validation.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[GET /api/questions]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = createQuestionSchema.safeParse(body);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Datos de pregunta invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const question = await createQuestion(userId, validation.data);

    return NextResponse.json(
      {
        message: "Pregunta creada exitosamente.",
        question,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "INVALID_TECHNOLOGY_IDS") {
      const response: ErrorResponse = {
        error: "Una o mas etiquetas de tecnologia no existen en el catalogo.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error("[POST /api/questions]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}

// demo pipeline ms03