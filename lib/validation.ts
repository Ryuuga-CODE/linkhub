import { z } from "zod";
import { PLATFORM_MAP } from "./platforms";
import { THEME_IDS } from "./themes";

export const RESERVED = new Set(["login", "register", "dashboard", "go", "api", "admin", "logout", "_next"]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, "El usuario debe tener 3–30 caracteres: letras, números, _ o .")
  .refine((u) => !RESERVED.has(u), "Ese nombre de usuario está reservado");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  username: usernameSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "El nombre es obligatorio").max(60),
  bio: z.string().trim().max(200, "La bio admite 200 caracteres"),
  avatarUrl: z.union([z.literal(""), z.string().trim().url("URL de avatar no válida")]),
  theme: z.enum(THEME_IDS as [string, ...string[]]),
});

export const linkSchema = z.object({
  platform: z.string().refine((p) => p in PLATFORM_MAP, "Plataforma no válida"),
  title: z.string().trim().max(80),
  url: z
    .string()
    .trim()
    .transform((u) => (/^(https?:|mailto:)/i.test(u) ? u : `https://${u}`))
    .pipe(z.string().url("URL no válida").refine((u) => /^(https?:|mailto:)/i.test(u), "Solo se permiten enlaces http(s) o mailto")),
});
