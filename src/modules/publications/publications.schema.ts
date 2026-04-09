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
    // Soporte para 'description' (backend original) o 'content' (frontend actual)
    description: z
      .string()
      .max(5000, "La descripcion no puede superar los 5000 caracteres.")
      .optional(),
    content: z
      .string()
      .max(5000, "El contenido no puede superar los 5000 caracteres.")
      .optional(),

    errorCode: z.string().max(5000).optional(),
    solution: z.string().max(5000).optional(),

    codeBlock: z.string().max(10000).optional(),
    language: z.string().max(50).optional(),

    // Soporte para 'technologyIds' (array) or 'technologyId' (single string)
    technologyIds: z
      .array(z.string())
      .max(5, "Se permiten como maximo 5 etiquetas.")
      .optional()
      .default([]),
    technologyId: z
      .string()
      .optional(),
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
  .transform((data) => {
    // 1. Mapeo de description/content
    const finalDescription = data.description || data.content || "";

    // 2. Mapeo inteligente para Snippet (codeBlock)
    let finalCodeBlock = data.codeBlock;
    if (data.type === PublicationType.CODE_SNIPPET && !finalCodeBlock) {
      finalCodeBlock = data.content || data.description;
    }

    // 3. Mapeo inteligente para Solution (solution)
    let finalSolution = data.solution;
    if (data.type === PublicationType.ERROR_SOLUTION && !finalSolution) {
      finalSolution = data.content || data.description;
    }

    // 4. Mapeo de technologyId -> technologyIds
    const finalTechIds = [...(data.technologyIds || [])];
    if (data.technologyId && !finalTechIds.includes(data.technologyId)) {
      finalTechIds.push(data.technologyId);
    }

    return {
      ...data,
      description: finalDescription,
      codeBlock: finalCodeBlock,
      solution: finalSolution,
      technologyIds: finalTechIds,
    };
  })
  .superRefine((data, ctx) => {
    if (!data.description && !data.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El contenido de la publicación es requerido.",
        path: ["content"],
      });
    }

    if (data.type === PublicationType.ERROR_SOLUTION) {
      if (!data.errorCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El código de error es obligatorio.",
          path: ["errorCode"],
        });
      }
    }

    if (data.type === PublicationType.CODE_SNIPPET) {
      if (!data.codeBlock && !data.content && !data.description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El bloque de código es obligatorio.",
          path: ["codeBlock"],
        });
      }
    }

    const normalizedNames = (data.technologyNames ?? []).map((name: string) =>
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
    content: z.string().min(1).max(5000).optional(),
    errorCode: z.string().max(5000).nullable().optional(),
    solution: z.string().max(5000).nullable().optional(),
    codeBlock: z.string().max(10000).nullable().optional(),
    language: z.string().max(50).nullable().optional(),
    technologyIds: z
      .array(z.string())
      .max(5, "Se permiten como maximo 5 etiquetas.")
      .optional(),
    technologyId: z.string().optional(),
    technologyNames: z
      .array(z.string().trim().min(2).max(50))
      .max(5, "Se permiten como maximo 5 etiquetas.")
      .optional(),
  })
  .transform((data) => {
    const transformed: Record<string, any> = { ...data };

    if (data.content !== undefined && data.description === undefined) {
      transformed.description = data.content;
    }

    if (data.technologyId !== undefined) {
      const ids = data.technologyIds || [];
      if (!ids.includes(data.technologyId)) {
        transformed.technologyIds = [...ids, data.technologyId];
      }
    }

    return transformed;
  })
  .superRefine((data, ctx) => {
    const normalizedNames = (data.technologyNames ?? []).map((name: string) =>
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
