import { NextRequest, NextResponse } from "next/server";
import {
    createTechnologySchema,
    listTechnologiesQuerySchema,
} from "@/modules/technologies/technologies.schema";
import {
    listTechnologies,
    upsertTechnologyByName,
} from "@/modules/technologies/technologies.service";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const parsed = listTechnologiesQuerySchema.safeParse({
            search: searchParams.get("search") ?? undefined,
            limit: searchParams.get("limit") ?? "20",
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Parametros invalidos.",
                    details: parsed.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        const result = await listTechnologies(parsed.data);
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error("[GET /api/technologies]", error);
        return NextResponse.json(
            { error: "Error interno del servidor." },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = createTechnologySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Datos invalidos.",
                    details: parsed.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        const technology = await upsertTechnologyByName(parsed.data);

        return NextResponse.json(
            { message: "Etiqueta procesada exitosamente.", technology },
            { status: 200 }
        );
    } catch (error: unknown) {
        const err = error as Error;
        if (err.message === "INVALID_TECHNOLOGY_NAME") {
            return NextResponse.json(
                { error: "Nombre de tecnologia invalido." },
                { status: 400 }
            );
        }

        console.error("[POST /api/technologies]", err.message);
        return NextResponse.json(
            { error: "Error interno del servidor." },
            { status: 500 }
        );
    }
}
