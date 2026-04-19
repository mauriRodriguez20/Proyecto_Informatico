import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getMyUnreadNotificationsCount } from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

export async function GET(req: NextRequest) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const result = await getMyUnreadNotificationsCount(userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[GET /api/notifications/unread-count]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
