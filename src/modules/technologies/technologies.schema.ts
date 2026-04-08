import { z } from "zod";

export const listTechnologiesQuerySchema = z.object({
    search: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
});

export const createTechnologySchema = z.object({
    name: z
        .string({ required_error: "El nombre de la tecnologia es obligatorio." })
        .trim()
        .min(2, "El nombre debe tener al menos 2 caracteres.")
        .max(50, "El nombre no puede superar 50 caracteres."),
});

export type ListTechnologiesQuery = z.infer<typeof listTechnologiesQuerySchema>;
export type CreateTechnologyInput = z.infer<typeof createTechnologySchema>;
