import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { fetchWithKeepAlive } from "@/lib/http-client";
import { uuidParamSchema } from "@/modules/questions/questions.schema";
import { acceptAnswer } from "@/modules/questions/questions.service";
import type { ErrorResponse } from "@/modules/questions/questions.types";

interface NotificationDispatchResult {
  status: "sent" | "skipped" | "failed";
  details?: string;
}

async function notifyAcceptedAnswer(
  req: NextRequest,
  questionId: string,
  answerId: string
): Promise<NotificationDispatchResult> {
  const ms04Url = process.env.MS04_URL?.trim();
  if (!ms04Url) {
    return {
      status: "skipped",
      details: "MS04_URL no configurada.",
    };
  }

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return {
      status: "skipped",
      details: "Token de autorizacion no disponible para propagar a MS04.",
    };
  }

  try {
    const response = await fetchWithKeepAlive(
      `${ms04Url}/api/questions/${questionId}/answers/${answerId}/accepted-notification`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (response.ok) {
      return { status: "sent" };
    }

    const rawBody = await response.text();
    const details = rawBody?.trim()
      ? `MS04 respondio ${response.status}: ${rawBody.slice(0, 200)}`
      : `MS04 respondio ${response.status}.`;

    return {
      status: "failed",
      details,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      status: "failed",
      details: `Error al conectar con MS04: ${err.message}`,
    };
  }
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

    const answer = await acceptAnswer(
      questionIdValidation.data,
      answerIdValidation.data,
      userId
    );

    const notification = await notifyAcceptedAnswer(
      req,
      questionIdValidation.data,
      answerIdValidation.data
    );

    if (notification.status === "failed") {
      console.warn(
        "[PATCH /api/questions/:id/answers/:answerId/accept] Notificacion no enviada:",
        notification.details
      );
    }

    return NextResponse.json(
      {
        message: "Respuesta marcada como aceptada.",
        answer,
        notification,
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
