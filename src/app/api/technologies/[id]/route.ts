import { NextRequest, NextResponse } from "next/server";
import { getTechnologyById } from "@/modules/technologies/technologies.service";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const technology = await getTechnologyById(id);

        if (!technology) {
            return NextResponse.json(
                { error: "Tecnologia no encontrada." },
                { status: 404 }
            );
        }

        return NextResponse.json({ technology }, { status: 200 });
    } catch (error) {
        console.error("[GET /api/technologies/:id]", error);
        return NextResponse.json(
            { error: "Error interno del servidor." },
            { status: 500 }
        );
    }
}
