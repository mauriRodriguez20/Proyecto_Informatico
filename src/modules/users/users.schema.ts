import { Role } from "@prisma/client";
import { z } from "zod";

const usernameRegex = /^[a-zA-Z0-9._-]+$/;

export const registerSchema = z.object({
  email: z
    .string({ required_error: "El correo electronico es obligatorio." })
    .trim()
    .email("Debes ingresar un correo electronico valido.")
    .max(255, "El correo electronico no puede superar 255 caracteres."),
  username: z
    .string({ required_error: "El nombre de usuario es obligatorio." })
    .trim()
    .min(3, "El nombre de usuario debe tener al menos 3 caracteres.")
    .max(30, "El nombre de usuario no puede superar 30 caracteres.")
    .regex(
      usernameRegex,
      "El nombre de usuario solo permite letras, numeros, punto, guion y guion bajo."
    ),
  password: z
    .string({ required_error: "La contrasena es obligatoria." })
    .min(8, "La contrasena debe tener al menos 8 caracteres.")
    .max(72, "La contrasena no puede superar 72 caracteres."),
  role: z.nativeEnum(Role, {
    required_error: "El rol es obligatorio.",
    invalid_type_error: "El rol debe ser FRONTEND o BACKEND.",
  }),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "El correo electronico es obligatorio." })
    .trim()
    .email("Debes ingresar un correo electronico valido."),
  password: z.string({ required_error: "La contrasena es obligatoria." }).min(1),
});

export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "El nombre de usuario debe tener al menos 3 caracteres.")
      .max(30, "El nombre de usuario no puede superar 30 caracteres.")
      .regex(
        usernameRegex,
        "El nombre de usuario solo permite letras, numeros, punto, guion y guion bajo."
      )
      .optional(),
    role: z.nativeEnum(Role, {
      invalid_type_error: "El rol debe ser FRONTEND o BACKEND.",
    }).optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(2_000_000, "avatarUrl es demasiado larga.")
      .refine(
        (value) => {
          if (value.startsWith("data:image/")) return true;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        "avatarUrl debe ser una URL valida o un data URL de imagen."
      )
      .nullable()
      .optional(),
    description: z
      .string()
      .trim()
      .max(400, "La descripcion no puede superar 400 caracteres.")
      .nullable()
      .optional(),
    technologyIds: z
      .array(z.string().uuid("Cada technologyId debe ser un UUID valido."))
      .max(30, "No puedes asociar mas de 30 tecnologias.")
      .optional(),
  })
  .refine(
    (data) =>
      data.username !== undefined ||
      data.role !== undefined ||
      data.avatarUrl !== undefined ||
      data.description !== undefined ||
      data.technologyIds !== undefined,
    { message: "Debes enviar al menos un campo para actualizar." }
  );

export const rateUserSchema = z.object({
  score: z.coerce
    .number({ required_error: "El score es obligatorio." })
    .int("El score debe ser un numero entero.")
    .min(1, "El score minimo es 1.")
    .max(5, "El score maximo es 5."),
});

export const changePasswordSchema = z.object({
  newPassword: z
    .string({ required_error: "La nueva contrasena es obligatoria." })
    .min(8, "La nueva contrasena debe tener al menos 8 caracteres.")
    .max(72, "La nueva contrasena no puede superar 72 caracteres."),
  currentPassword: z
    .string({ required_error: "La contrasena actual es obligatoria." })
    .min(1, "La contrasena actual es obligatoria."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "El correo electronico es obligatorio." })
    .trim()
    .email("Debes ingresar un correo electronico valido.")
    .max(255, "El correo electronico no puede superar 255 caracteres."),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RateUserInput = z.infer<typeof rateUserSchema>;
