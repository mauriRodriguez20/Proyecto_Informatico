import { z } from "zod";
import { PublicationType, Area } from "@prisma/client";

export const createPublicationSchema = z
  .object({
    type: z.nativeEnum(PublicationType),
    area: z.nativeEnum(Area),
    title: z
      .string()
      .min(10, "El titulo debe tener al menos 10 caracteres.")
      .max(200, "El titulo no puede superar los 200 caracteres."),
    description: z
      .string()
      .min(1, "La descripcion es requerida.")
      .max(5000, "La descripcion no puede superar los 5000 caracteres."),

    errorCode: z.string().max(5000).optional(),
    solution: z.string().max(5000).optional(),

    codeBlock: z.string().max(10000).optional(),
    language: z.string().max(50).optional(),

    technologyIds: z
      .array(z.string().uuid("Cada etiqueta debe ser un UUID valido."))
      .max(5, "Se permiten como maximo 5 etiquetas.")
      .optional()
      .default([]),
    technologyNames: z
      .array(
        z
          .string()
          .trim()
          .min(2, "Cada etiqueta debe tener al menos 2 caracteres.")
          .max(50, "Cada etiqueta no puede superar 50 caracteres.")
      )
      .max(5, "Se permiten como maximo 5 etiquetas.")
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === PublicationType.ERROR_SOLUTION) {
      if (!data.errorCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El codigo de error es obligatorio para soluciones de error.",
          path: ["errorCode"],
        });
      }
      if (!data.solution) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La solucion es obligatoria para soluciones de error.",
          path: ["solution"],
        });
      }
    }

    if (data.type === PublicationType.CODE_SNIPPET && !data.codeBlock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El bloque de codigo es obligatorio para fragmentos de codigo.",
        path: ["codeBlock"],
      });
    }

    const normalizedNames = (data.technologyNames ?? []).map((name) =>
      name.toLowerCase()
    );
    const totalUniqueTags = new Set([
      ...(data.technologyIds ?? []),
      ...normalizedNames,
    ]).size;

    if (totalUniqueTags > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La publicacion no puede tener mas de 5 etiquetas en total.",
        path: ["technologyNames"],
      });
    }
  });

export const updatePublicationSchema = z
  .object({
    area: z.nativeEnum(Area).optional(),
    title: z
      .string()
      .min(10, "El titulo debe tener al menos 10 caracteres.")
      .max(200)
      .optional(),
    description: z.string().min(1).max(5000).optional(),
    errorCode: z.string().max(5000).nullable().optional(),
    solution: z.string().max(5000).nullable().optional(),
    codeBlock: z.string().max(10000).nullable().optional(),
    language: z.string().max(50).nullable().optional(),
    technologyIds: z
      .array(z.string().uuid())
      .max(5, "Se permiten como maximo 5 etiquetas.")
      .optional(),
    technologyNames: z
      .array(z.string().trim().min(2).max(50))
      .max(5, "Se permiten como maximo 5 etiquetas.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const normalizedNames = (data.technologyNames ?? []).map((name) =>
      name.toLowerCase()
    );
    const totalUniqueTags = new Set([
      ...(data.technologyIds ?? []),
      ...normalizedNames,
    ]).size;

    if (totalUniqueTags > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La publicacion no puede tener mas de 5 etiquetas en total.",
        path: ["technologyNames"],
      });
    }
  });

export const listPublicationsQuerySchema = z.object({
  type: z.nativeEnum(PublicationType).optional(),
  area: z.nativeEnum(Area).optional(),
  authorId: z.string().uuid().optional(),
  technologyId: z.string().uuid().optional(),
  sortBy: z.enum(["recent", "most_voted"]).default("recent"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type CreatePublicationBody = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationBody = z.infer<typeof updatePublicationSchema>;
export type ListPublicationsQuery = z.infer<typeof listPublicationsQuerySchema>;
