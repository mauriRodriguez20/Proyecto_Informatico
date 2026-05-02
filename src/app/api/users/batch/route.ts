import { NextRequest, NextResponse } from "next/server";
import { getUsersByIdsForAuthorSnapshot } from "@/modules/users/users.service";
import type { ErrorResponse } from "@/modules/users/users.types";

// GET /api/users/batch?ids=id1,id2,id3
// Public endpoint optimized for cross-service author snapshots.
export async function GET(req: NextRequest) {
  try {
    const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
    const ids = idsParam
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (ids.length === 0) {
      const response: ErrorResponse = {
        error: "Debes enviar al menos un id en query (?ids=id1,id2).",
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (ids.length > 100) {
      const response: ErrorResponse = {
        error: "Solo se permiten hasta 100 ids por solicitud.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const users = await getUsersByIdsForAuthorSnapshot(ids);
    return NextResponse.json({ users }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[GET /api/users/batch]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}

