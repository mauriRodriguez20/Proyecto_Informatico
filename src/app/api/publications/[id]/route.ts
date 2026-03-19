import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { updatePublicationSchema } from "@/modules/publications/publications.schema";
import {
  getPublicationById,
  updatePublication,
  deletePublication,
} from "@/modules/publications/publications.service";

// ──────────────────────────────────────────────────────────────
//  GET /api/publications/:id  — HU-011: Ver detalle (público)
// ──────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const publication = await getPublicationById(params.id);

    if (!publication) {
      return NextResponse.json(
        { error: "Publicación no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ publication }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/publications/:id]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────
//  PATCH /api/publications/:id  — HU-012: Editar (solo el autor)
// ──────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    // Verificar que la publicación existe
    const existing = await getPublicationById(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Publicación no encontrada." },
        { status: 404 }
      );
    }

    // Verificar que el usuario es el autor
    if (existing.authorId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para editar esta publicación." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updatePublicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updatePublication(params.id, parsed.data);

    return NextResponse.json(
      { message: "Publicación actualizada exitosamente.", publication: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/publications/:id]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────
//  DELETE /api/publications/:id  — HU-013: Eliminar (solo el autor)
// ──────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    // Verificar que la publicación existe
    const existing = await getPublicationById(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Publicación no encontrada." },
        { status: 404 }
      );
    }

    // Verificar que el usuario es el autor
    if (existing.authorId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta publicación." },
        { status: 403 }
      );
    }

    await deletePublication(params.id);

    return NextResponse.json(
      { message: "Publicación eliminada exitosamente." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /api/publications/:id]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
