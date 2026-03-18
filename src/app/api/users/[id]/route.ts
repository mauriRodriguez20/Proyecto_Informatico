import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { updateProfileSchema } from "@/modules/users/users.schema";
import {
  getUserById,
  updateUserProfile,
} from "@/modules/users/users.service";
import type { ErrorResponse } from "@/modules/users/users.types";

// ─────────────────────────────────────────────────────────────
// GET /api/users/[id]   — HU-007: Ver perfil público
// Acceso: Público (no requiere autenticación)
// ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
      const response: ErrorResponse = { error: "Usuario no encontrado." };
      return NextResponse.json(response, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[GET /api/users/:id]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/users/[id]  — HU-008: Editar perfil propio
// Acceso: Protegido — solo el propio usuario puede editarse
// ─────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 1. Verificar autenticación
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    // 2. Verificar que el usuario autenticado es el dueño del perfil
    if (userId !== id) {
      const response: ErrorResponse = {
        error: "No tienes permiso para editar este perfil.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 3. Validar el body con Zod
    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      const response: ErrorResponse = {
        error:   "Datos de actualización inválidos.",
        details: validation.error.errors[0].message,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // 4. Actualizar el perfil
    const user = await updateUserProfile(userId, validation.data);

    return NextResponse.json(
      { message: "Perfil actualizado exitosamente.", user },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "USER_NOT_FOUND") {
      const response: ErrorResponse = { error: "Usuario no encontrado." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "INVALID_TECHNOLOGIES") {
      const response: ErrorResponse = {
        error: "Una o más tecnologías no son válidas.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.error("[PATCH /api/users/:id]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
