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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const parsed = listPublicationsQuerySchema.safeParse({
      type: searchParams.get("type") ?? undefined,
      area: searchParams.get("area") ?? undefined,
      authorId: searchParams.get("authorId") ?? undefined,
      technologyId: searchParams.get("technologyId") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? "recent",
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "10",
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Parametros de consulta invalidos.",
          details: parsed.error.flatten().fieldErrors,
        },
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

export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await withAuth(req);
    if (errorResponse) return errorResponse;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    const body = await req.json();
    const parsed = createPublicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const publication = await createPublication(userId, parsed.data, token);

    return NextResponse.json(
      { message: "Publicacion creada exitosamente.", publication },
      { status: 201 }
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

    console.error("[POST /api/publications]", err.message);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
