import { z } from "zod";

const AVATAR_ALLOWED_EXTENSIONS = /(\.jpg|\.jpeg|\.png)(\?.*)?$/i;
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

export const registerSchema = z.object({
    email: z
        .string({ required_error: "El email es obligatorio." })
        .email({ message: "El formato del email no es valido." }),

    password: z
        .string({ required_error: "La contrasena es obligatoria." })
        .min(8, { message: "La contrasena debe tener minimo 8 caracteres." }),

    username: z
        .string({ required_error: "El nombre de usuario es obligatorio." })
        .min(3, { message: "El nombre de usuario debe tener minimo 3 caracteres." })
        .max(30, { message: "El nombre de usuario no puede superar 30 caracteres." })
        .regex(/^[a-zA-Z0-9_]+$/, {
            message:
                "El nombre de usuario solo puede contener letras, numeros y guiones bajos.",
        }),

    role: z.enum(["FRONTEND", "BACKEND"], {
        required_error: "Debes seleccionar un rol.",
        invalid_type_error: "El rol debe ser FRONTEND o BACKEND.",
    }),
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: "El email es obligatorio." })
        .email({ message: "El formato del email no es valido." }),

    password: z
        .string({ required_error: "La contrasena es obligatoria." })
        .min(1, { message: "La contrasena es obligatoria." }),
});

export const updateProfileSchema = z
    .object({
        description: z
            .string()
            .max(500, "La descripcion no puede superar los 500 caracteres.")
            .optional(),
        avatarUrl: z
            .string()
            .url("La URL del avatar no tiene un formato valido.")
            .refine((value) => AVATAR_ALLOWED_EXTENSIONS.test(value), {
                message: "El avatar debe ser JPG o PNG.",
            })
            .optional(),
        avatarFileSizeBytes: z
            .number()
            .int()
            .positive()
            .max(MAX_AVATAR_SIZE_BYTES, "La imagen no puede superar 2MB.")
            .optional(),
        role: z
            .enum(["FRONTEND", "BACKEND"], {
                invalid_type_error: "El rol debe ser FRONTEND o BACKEND.",
            })
            .optional(),
        technologies: z
            .array(z.string().uuid("Cada tecnologia debe ser un UUID valido."))
            .max(10, "No puedes tener mas de 10 tecnologias.")
            .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "Debes enviar al menos un campo para actualizar.",
    });

export const rateUserSchema = z.object({
    score: z
        .number({
            required_error: "El puntaje es obligatorio.",
            invalid_type_error: "El puntaje debe ser un numero.",
        })
        .int("El puntaje debe ser un numero entero.")
        .min(1, "El puntaje minimo es 1.")
        .max(5, "El puntaje maximo es 5."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RateUserInput = z.infer<typeof rateUserSchema>;
