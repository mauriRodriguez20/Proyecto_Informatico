import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  createPublicationSchema,
  listPublicationsQuerySchema,
} from "@/modules/publications/publications.schema";
import {
  createPublication,
  listPublications,
} from "@/modules/publications/publications.service";

// ──────────────────────────────────────────────────────────────
//  GET /api/publications  — HU-014: Listar con filtros (público)
// ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const parsed = listPublicationsQuerySchema.safeParse({
      type:  searchParams.get("type")  ?? undefined,
      area:  searchParams.get("area")  ?? undefined,
      technologyId: searchParams.get("technologyId") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? "recent",
      page:  searchParams.get("page")  ?? "1",
      limit: searchParams.get("limit") ?? "10",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parámetros de consulta inválidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await listPublications(parsed.data);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[GET /api/publications]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────
//  POST /api/publications  — HU-010: Crear publicación (protegido)
// ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const parsed = createPublicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const publication = await createPublication(userId, parsed.data);

    return NextResponse.json(
      { message: "Publicación creada exitosamente.", publication },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/publications]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
