import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { uuidParamSchema } from "@/modules/interactions/interactions.schema";
import { markNotificationAsRead } from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const idValidation = uuidParamSchema.safeParse(id);

    if (!idValidation.success) {
      const response: ErrorResponse = { error: "El id de la notificacion no es valido." };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await markNotificationAsRead(userId, idValidation.data);
    return NextResponse.json(
      {
        message: "Notificacion marcada como leida.",
        notification: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "NOTIFICATION_NOT_FOUND") {
      const response: ErrorResponse = { error: "Notificacion no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    console.error("[PATCH /api/notifications/:id/read]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
