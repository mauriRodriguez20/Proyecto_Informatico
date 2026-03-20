import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// HU-004: Registro de usuario
// ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z
    .string({ required_error: "El email es obligatorio." })
    .email({ message: "El formato del email no es válido." }),

  password: z
    .string({ required_error: "La contraseña es obligatoria." })
    .min(8, { message: "La contraseña debe tener mínimo 8 caracteres." }),

  username: z
    .string({ required_error: "El nombre de usuario es obligatorio." })
    .min(3, { message: "El nombre de usuario debe tener mínimo 3 caracteres." })
    .max(30, { message: "El nombre de usuario no puede superar 30 caracteres." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message:
        "El nombre de usuario solo puede contener letras, números y guiones bajos.",
    }),

  role: z.enum(["FRONTEND", "BACKEND"], {
    required_error: "Debes seleccionar un rol.",
    invalid_type_error: "El rol debe ser FRONTEND o BACKEND.",
  }),
});

// ─────────────────────────────────────────────────────────────
// HU-005: Inicio de sesión
// ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string({ required_error: "El email es obligatorio." })
    .email({ message: "El formato del email no es válido." }),

  password: z
    .string({ required_error: "La contraseña es obligatoria." })
    .min(1, { message: "La contraseña es obligatoria." }),
});

// ─────────────────────────────────────────────────────────────
// HU-008: Editar perfil
// ─────────────────────────────────────────────────────────────

export const updateProfileSchema = z
  .object({
    description: z
      .string()
      .max(500, "La descripción no puede superar los 500 caracteres.")
      .optional(),
    avatarUrl: z
      .string()
      .url("La URL del avatar no tiene un formato válido.")
      .optional(),
    role: z
      .enum(["FRONTEND", "BACKEND"], {
        invalid_type_error: "El rol debe ser FRONTEND o BACKEND.",
      })
      .optional(),
    technologies: z
      .array(z.string().uuid("Cada tecnología debe ser un UUID válido."))
      .max(10, "No puedes tener más de 10 tecnologías.")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo para actualizar.",
  });

// ─────────────────────────────────────────────────────────────
// HU-009: Calificación entre usuarios
// ─────────────────────────────────────────────────────────────

export const rateUserSchema = z.object({
  score: z
    .number({
      required_error: "El puntaje es obligatorio.",
      invalid_type_error: "El puntaje debe ser un número.",
    })
    .int("El puntaje debe ser un número entero.")
    .min(1, "El puntaje mínimo es 1.")
    .max(5, "El puntaje máximo es 5."),
});

// ─────────────────────────────────────────────────────────────
// Tipos inferidos
// ─────────────────────────────────────────────────────────────

export type RegisterInput     = z.infer<typeof registerSchema>;
export type LoginInput        = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RateUserInput     = z.infer<typeof rateUserSchema>;
