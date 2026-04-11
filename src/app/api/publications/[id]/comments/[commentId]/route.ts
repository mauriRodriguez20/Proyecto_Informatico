import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { uuidParamSchema } from "@/modules/interactions/interactions.schema";
import { deletePublicationComment } from "@/modules/interactions/interactions.service";
import type { ErrorResponse } from "@/modules/interactions/interactions.types";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const { id, commentId } = await params;
    const publicationIdValidation = uuidParamSchema.safeParse(id);
    const commentIdValidation = uuidParamSchema.safeParse(commentId);

    if (!publicationIdValidation.success || !commentIdValidation.success) {
      const response: ErrorResponse = {
        error: "Los identificadores de publicacion o comentario no son validos.",
      };
      return NextResponse.json(response, { status: 400 });
    }

    await deletePublicationComment(
      publicationIdValidation.data,
      commentIdValidation.data,
      userId
    );

    return NextResponse.json(
      { message: "Comentario eliminado exitosamente." },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;

    if (err.message === "PUBLICATION_NOT_FOUND") {
      const response: ErrorResponse = { error: "Publicacion no encontrada." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "COMMENT_NOT_FOUND") {
      const response: ErrorResponse = { error: "Comentario no encontrado." };
      return NextResponse.json(response, { status: 404 });
    }

    if (err.message === "FORBIDDEN_COMMENT_DELETE") {
      const response: ErrorResponse = {
        error: "No tienes permiso para eliminar este comentario.",
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error("[DELETE /api/publications/:id/comments/:commentId]", err.message);
    const response: ErrorResponse = { error: "Error interno del servidor." };
    return NextResponse.json(response, { status: 500 });
  }
}
