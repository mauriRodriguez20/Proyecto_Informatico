import { z } from "zod";
import { PublicationType, Area } from "@prisma/client";

// ──────────────────────────────────────────────────────────────
//  Schema para CREAR una publicación (POST /api/publications)
// ──────────────────────────────────────────────────────────────

export const createPublicationSchema = z
  .object({
    type: z.nativeEnum(PublicationType),
    area: z.nativeEnum(Area),
    title: z
      .string()
      .min(10, "El título debe tener al menos 10 caracteres.")
      .max(200, "El título no puede superar los 200 caracteres."),
    description: z
      .string()
      .min(1, "La descripción es requerida.")
      .max(5000, "La descripción no puede superar los 5000 caracteres."),

    // Campos opcionales para ERROR_SOLUTION
    errorCode: z.string().max(5000).optional(),
    solution: z.string().max(5000).optional(),

    // Campos para bloques de código
    codeBlock: z.string().max(10000).optional(),
    language: z.string().max(50).optional(),

    // Tags (hasta 5 technologyIds del catálogo de MS-01)
    technologyIds: z
      .array(z.string().uuid("Cada tag debe ser un UUID válido."))
      .max(5, "Se permiten como máximo 5 etiquetas.")
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === PublicationType.ERROR_SOLUTION) {
      if (!data.errorCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El código de error es obligatorio para soluciones de error.",
          path: ["errorCode"],
        });
      }
      if (!data.solution) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La solución es obligatoria para soluciones de error.",
          path: ["solution"],
        });
      }
    }

    if (data.type === PublicationType.CODE_SNIPPET) {
      if (!data.codeBlock) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El bloque de código es obligatorio para fragmentos de código.",
          path: ["codeBlock"],
        });
      }
      if (!data.language) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El lenguaje de programación es obligatorio para fragmentos de código.",
          path: ["language"],
        });
      }
    }
  });

// ──────────────────────────────────────────────────────────────
//  Schema para EDITAR una publicación (PATCH /api/publications/:id)
// ──────────────────────────────────────────────────────────────

export const updatePublicationSchema = z.object({
  area: z.nativeEnum(Area).optional(),
  title: z
    .string()
    .min(10, "El título debe tener al menos 10 caracteres.")
    .max(200)
    .optional(),
  description: z.string().min(1).max(5000).optional(),
  errorCode: z.string().max(5000).nullable().optional(),
  solution: z.string().max(5000).nullable().optional(),
  codeBlock: z.string().max(10000).nullable().optional(),
  language: z.string().max(50).nullable().optional(),
  technologyIds: z
    .array(z.string().uuid())
    .max(5, "Se permiten como máximo 5 etiquetas.")
    .optional(),
});

// ──────────────────────────────────────────────────────────────
//  Schema para LISTAR publicaciones (GET /api/publications)
// ──────────────────────────────────────────────────────────────

export const listPublicationsQuerySchema = z.object({
  type: z.nativeEnum(PublicationType).optional(),
  area: z.nativeEnum(Area).optional(),
  technologyId: z.string().uuid().optional(),
  sortBy: z.enum(["recent", "most_voted"]).default("recent"),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .default(10), // HU-014: Paginación en grupos de 10
});

export type CreatePublicationBody = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationBody = z.infer<typeof updatePublicationSchema>;
export type ListPublicationsQuery  = z.infer<typeof listPublicationsQuerySchema>;
