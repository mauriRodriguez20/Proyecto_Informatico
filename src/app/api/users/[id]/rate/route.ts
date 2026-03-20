import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { rateUserSchema } from "@/modules/users/users.schema";
import { rateUser } from "@/modules/users/users.service";
import type { ErrorResponse, RateUserResponse } from "@/modules/users/users.types";

// ─────────────────────────────────────────────────────────────
// POST /api/users/[id]/rate  — HU-009: Calificar a un usuario
// Acceso: Protegido — un usuario no puede calificarse a sí mismo
// ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 1. Verificar autenticación y obtener el raterId
    const { userId: raterId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    // 2. Validar el body con Zod
    const body = await req.json();
    const validation = rateUserSchema.safeParse(body);

    if (!validation.success) {
      const response: ErrorResponse = {
        error:   "Datos de calificación inválidos.",
        details: validation.error.errors[0].message,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 3. Ejecutar la calificación
    const { avgRating, totalRatings } = await rateUser(
      raterId,
      id,
      validation.data
    );

    const response: RateUserResponse = {
      message:      "Calificación registrada exitosamente.",
      avgRating,
      totalRatings,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "SELF_RATING_NOT_ALLOWED") {
      const response: ErrorResponse = {
        error: "No puedes calificarte a ti mismo.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    if (err.message === "USER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Usuario no encontrado." };
      return NextResponse.json(response, { status: 404 });
    }

    console.error("[POST /api/users/:id/rate]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
