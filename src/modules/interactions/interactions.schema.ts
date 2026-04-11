import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "El comentario no puede estar vacio.")
    .max(500, "El comentario no puede superar los 500 caracteres."),
});

export const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const rateTargetSchema = z.object({
  score: z
    .number({
      required_error: "La calificacion es obligatoria.",
      invalid_type_error: "La calificacion debe ser numerica.",
    })
    .int("La calificacion debe ser un numero entero.")
    .min(1, "La calificacion minima es 1 estrella.")
    .max(5, "La calificacion maxima es 5 estrellas."),
});

export const uuidParamSchema = z.string().uuid("El identificador debe ser un UUID valido.");

export type CreateCommentBody = z.infer<typeof createCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type RateTargetBody = z.infer<typeof rateTargetSchema>;
