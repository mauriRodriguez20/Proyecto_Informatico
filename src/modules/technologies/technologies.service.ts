import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
    CreateTechnologyInput,
    ListTechnologiesQuery,
} from "./technologies.schema";
import type { TechnologyDto } from "./technologies.types";

const TECHNOLOGY_SELECT = {
    id: true,
    name: true,
    slug: true,
} as const;

function slugify(input: string): string {
    return input
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

function formatTechnologyName(rawName: string): string {
    return rawName
        .trim()
        .split(/\s+/)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
        .join(" ");
}

export async function listTechnologies(
    query: ListTechnologiesQuery
): Promise<{ data: TechnologyDto[]; total: number; limit: number }> {
    const where = query.search
        ? {
            OR: [
                { name: { contains: query.search, mode: "insensitive" as const } },
                { slug: { contains: slugify(query.search), mode: "insensitive" as const } },
            ],
        }
        : {};

    const [data, total] = await prisma.$transaction([
        prisma.technology.findMany({
            where,
            select: TECHNOLOGY_SELECT,
            orderBy: { name: "asc" },
            take: query.limit,
        }),
        prisma.technology.count({ where }),
    ]);

    return {
        data,
        total,
        limit: query.limit,
    };
}

export async function getTechnologyById(id: string): Promise<TechnologyDto | null> {
    return prisma.technology.findUnique({
        where: { id },
        select: TECHNOLOGY_SELECT,
    });
}

export async function upsertTechnologyByName(
    input: CreateTechnologyInput
): Promise<TechnologyDto> {
    const formattedName = formatTechnologyName(input.name);
    const slug = slugify(formattedName);

    if (!slug) {
        throw new Error("INVALID_TECHNOLOGY_NAME");
    }

    const existingBySlug = await prisma.technology.findUnique({
        where: { slug },
        select: TECHNOLOGY_SELECT,
    });

    if (existingBySlug) return existingBySlug;

    try {
        return await prisma.technology.create({
            data: {
                name: formattedName,
                slug,
            },
            select: TECHNOLOGY_SELECT,
        });
    } catch (error: unknown) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const existing = await prisma.technology.findFirst({
                where: {
                    OR: [
                        { slug },
                        { name: { equals: formattedName, mode: "insensitive" } },
                    ],
                },
                select: TECHNOLOGY_SELECT,
            });

            if (existing) return existing;
        }

        throw error;
    }
}
