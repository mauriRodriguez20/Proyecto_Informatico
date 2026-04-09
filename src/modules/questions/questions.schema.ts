import { z } from "zod";
import { Area } from "@prisma/client";

const languageSchema = z
  .string()
  .trim()
  .min(1, "El lenguaje es obligatorio cuando se envia codigo.")
  .max(50, "El lenguaje no puede superar 50 caracteres.")
  .regex(/^[a-zA-Z0-9_+#.\-]+$/, "El lenguaje contiene caracteres no permitidos.");

const technologyIdsSchema = z
  .array(z.string().uuid("Cada tecnologia debe ser un UUID valido."))
  .min(1, "Debes seleccionar al menos una etiqueta.")
  .max(5, "Solo se permiten hasta 5 etiquetas.")
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "No se permiten etiquetas duplicadas.",
  });

export const createQuestionSchema = z
  .object({
    area: z.nativeEnum(Area),
    title: z
      .string()
      .trim()
      .min(15, "El titulo debe tener al menos 15 caracteres.")
      .max(150, "El titulo no puede superar 150 caracteres."),
    description: z
      .string()
      .trim()
      .min(1, "La descripcion es obligatoria.")
      .max(10000, "La descripcion no puede superar 10000 caracteres."),
    codeBlock: z
      .string()
      .min(1, "El bloque de codigo no puede estar vacio.")
      .max(20000, "El bloque de codigo no puede superar 20000 caracteres.")
      .optional(),
    language: languageSchema.optional(),
    technologyIds: technologyIdsSchema,
  })
  .superRefine((data, ctx) => {
    if (data.codeBlock && !data.language) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes indicar el lenguaje cuando envias un bloque de codigo.",
        path: ["language"],
      });
    }

    if (data.language && !data.codeBlock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puedes enviar lenguaje sin bloque de codigo.",
        path: ["codeBlock"],
      });
    }
  });

export const listQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .default(10)
    .transform(() => 10),
  unanswered: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return false;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return value;
  }, z.boolean()),
  sortOrder: z
    .enum(["asc", "desc"], {
      invalid_type_error: "sortOrder solo puede ser 'asc' o 'desc'.",
    })
    .default("desc"),
});

export const createAnswerSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "El contenido de la respuesta es obligatorio.")
      .max(10000, "La respuesta no puede superar 10000 caracteres."),
    codeBlock: z
      .string()
      .min(1, "El bloque de codigo no puede estar vacio.")
      .max(20000, "El bloque de codigo no puede superar 20000 caracteres.")
      .optional(),
    language: languageSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.codeBlock && !data.language) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes indicar el lenguaje cuando envias un bloque de codigo.",
        path: ["language"],
      });
    }

    if (data.language && !data.codeBlock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puedes enviar lenguaje sin bloque de codigo.",
        path: ["codeBlock"],
      });
    }
  });

export const updateAnswerSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "El contenido no puede quedar vacio.")
      .max(10000, "La respuesta no puede superar 10000 caracteres.")
      .optional(),
    codeBlock: z
      .string()
      .min(1, "El bloque de codigo no puede estar vacio.")
      .max(20000, "El bloque de codigo no puede superar 20000 caracteres.")
      .nullable()
      .optional(),
    language: languageSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes enviar al menos un campo para actualizar.",
        path: ["content"],
      });
    }

    if (data.codeBlock && data.language === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes indicar el lenguaje cuando envias un bloque de codigo.",
        path: ["language"],
      });
    }

    if (data.codeBlock === null && data.language && data.language.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No puedes enviar lenguaje cuando eliminas el bloque de codigo.",
        path: ["language"],
      });
    }
  });

export const voteAnswerSchema = z.object({
  value: z
    .number({
      required_error: "El voto es obligatorio.",
      invalid_type_error: "El voto debe ser numerico.",
    })
    .int("El voto debe ser entero.")
    .refine((value) => value === 1 || value === -1, {
      message: "El voto solo puede ser 1 o -1.",
    }),
});

export const uuidParamSchema = z.string().uuid("El identificador debe ser un UUID valido.");

export type CreateQuestionBody = z.infer<typeof createQuestionSchema>;
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
export type CreateAnswerBody = z.infer<typeof createAnswerSchema>;
export type UpdateAnswerBody = z.infer<typeof updateAnswerSchema>;
export type VoteAnswerBody = z.infer<typeof voteAnswerSchema>;

