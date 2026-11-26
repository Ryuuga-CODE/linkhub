import { z } from "zod";
import { PLATFORM_MAP } from "./platforms";
import { THEME_IDS } from "./themes";
import { BUTTON_FILLS, BUTTON_SHAPES, FONTS } from "./customStyle";

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

export const linkOptionsSchema = z.object({
  display: z.enum(["button", "icon"]).catch("button"),
  highlight: z.preprocess((v) => v === "on", z.boolean()),
  kind: z.enum(["link", "product"]).catch("link"),
  price: z.string().trim().max(30, "El precio admite 30 caracteres").catch(""),
});

export const contactSchema = z.object({
  contactPhone: z.string().trim().regex(/^[+\d\s()-]{0,25}$/, "Teléfono no válido"),
  contactWhatsapp: z.string().trim().regex(/^[+\d\s()-]{0,25}$/, "WhatsApp no válido: usa el número con código de país"),
  contactEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email("Correo de contacto no válido")]),
  contactAddress: z.string().trim().max(200, "La dirección admite 200 caracteres"),
  contactHours: z.string().trim().max(120, "El horario admite 120 caracteres"),
});

const color = z.string().trim().regex(/^(#[0-9a-fA-F]{6})?$/, "Color no válido").catch("");
const oneOf = (ids: string[]) => z.string().refine((v) => ids.includes(v)).catch("");

export const customStyleSchema = z.object({
  colorButton: color,
  colorButtonText: color,
  colorText: color,
  colorBg: color,
  colorBg2: color,
  buttonShape: oneOf(BUTTON_SHAPES.map((x) => x.id)),
  buttonFill: oneOf(BUTTON_FILLS.map((x) => x.id)),
  font: oneOf(FONTS.map((x) => x.id)),
});
