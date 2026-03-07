import { z } from "zod";
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
      message: "El nombre de usuario solo puede contener letras, números y guiones bajos.",
    }),

  role: z.enum(["FRONTEND", "BACKEND"], {
    required_error: "Debes seleccionar un rol.",
    invalid_type_error: "El rol debe ser FRONTEND o BACKEND.",
  }),
});


export const loginSchema = z.object({
  email: z
    .string({ required_error: "El email es obligatorio." })
    .email({ message: "El formato del email no es válido." }),

  password: z
    .string({ required_error: "La contraseña es obligatoria." })
    .min(1, { message: "La contraseña es obligatoria." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput    = z.infer<typeof loginSchema>;
