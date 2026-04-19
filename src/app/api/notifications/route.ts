import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { listNotificationsQuerySchema } from "@/modules/interactions/interactions.schema";
import { listMyNotifications } from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

function getFirstFieldError(details: Record<string, string[] | undefined>): string | undefined {
  const first = Object.values(details).find((messages) => messages && messages.length > 0);
  return first?.[0];
}

export async function GET(req: NextRequest) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const validation = listNotificationsQuerySchema.safeParse({
      page: req.nextUrl.searchParams.get("page") ?? "1",
      limit: req.nextUrl.searchParams.get("limit") ?? "20",
      unreadOnly: req.nextUrl.searchParams.get("unreadOnly") ?? undefined,
    });

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const response: ErrorResponse = {
        error: "Parametros de consulta invalidos.",
        details: getFirstFieldError(fieldErrors),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await listMyNotifications(userId, validation.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[GET /api/notifications]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
