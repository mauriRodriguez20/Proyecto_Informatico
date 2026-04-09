import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { updatePublicationSchema } from "@/modules/publications/publications.schema";
import {
  getPublicationById,
  updatePublication,
  deletePublication,
} from "@/modules/publications/publications.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const publication = await getPublicationById(id);

    if (!publication) {
      return NextResponse.json(
        { error: "Publicacion no encontrada." },
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    const existing = await getPublicationById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Publicacion no encontrada." },
        { status: 404 }
      );
    }

    if (existing.authorId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para editar esta publicacion." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updatePublicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updatePublication(id, parsed.data, token);
    return NextResponse.json(
      { message: "Publicacion actualizada exitosamente.", publication: updated },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "MS01_URL_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "No se puede procesar etiquetas por nombre: falta MS01_URL." },
        { status: 500 }
      );
    }

    if (err.message === "TECHNOLOGY_UPSERT_FAILED") {
      return NextResponse.json(
        { error: "No fue posible validar o crear una etiqueta en MS01." },
        { status: 502 }
      );
    }

    if (err.message === "TOO_MANY_TAGS") {
      return NextResponse.json(
        { error: "La publicacion no puede tener mas de 5 etiquetas." },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/publications/:id]", err.message);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const existing = await getPublicationById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Publicacion no encontrada." },
        { status: 404 }
      );
    }

    if (existing.authorId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta publicacion." },
        { status: 403 }
      );
    }

    await deletePublication(id);
    return NextResponse.json(
      { message: "Publicacion eliminada exitosamente." },
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
