import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

// EMAIL_TRANSPORT=console: modo desarrollo, los correos se imprimen en la consola
const consoleTransport = () => process.env.EMAIL_TRANSPORT === "console";

/** ¿Está configurado el envío de correos? (Resend, o la consola en desarrollo) */
export const emailEnabled = () => !!process.env.RESEND_API_KEY || consoleTransport();

const FROM = () => process.env.EMAIL_FROM || "LinkHub <onboarding@resend.dev>";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Crea un enlace de un solo uso. En la base de datos solo se guarda su hash. */
export async function createToken(userId: string, type: "verify" | "reset") {
  const token = randomBytes(32).toString("base64url");
  const ttl = type === "reset" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1 h / 24 h
  // Un enlace nuevo invalida los anteriores del mismo tipo
  await db.token.deleteMany({ where: { userId, type } });
  await db.token.create({ data: { userId, type, tokenHash: hash(token), expiresAt: new Date(Date.now() + ttl) } });
  return token;
}

/** Consume un enlace: devuelve el usuario si es válido y no se usó ni caducó. */
export async function useToken(token: string, type: "verify" | "reset") {
  const t = await db.token.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!t || t.type !== type || t.usedAt || t.expiresAt < new Date()) return null;
  const updated = await db.token.updateMany({ where: { id: t.id, usedAt: null }, data: { usedAt: new Date() } });
  return updated.count === 1 ? t.user : null; // evita usar el mismo enlace dos veces a la vez
}

/** Solo comprueba (sin consumir) que un enlace de restablecer es válido, para mostrar el formulario. */
export async function peekToken(token: string, type: "verify" | "reset") {
  const t = await db.token.findUnique({ where: { tokenHash: hash(token) } });
  return !!t && t.type === type && !t.usedAt && t.expiresAt > new Date();
}

async function send(to: string, subject: string, html: string, text: string) {
  if (consoleTransport()) {
    console.log(`[correo a ${to}] ${subject}\n${text}`);
    return true;
  }
  if (!process.env.RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [to], subject, html, text }),
  });
  if (!res.ok) console.error("Resend", res.status, await res.text());
  return res.ok;
}

const layout = (title: string, body: string, cta: string, url: string) => `
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#16161d">
  <p style="font-size:20px;font-weight:800">🔗 LinkHub</p>
  <h1 style="font-size:22px">${title}</h1>
  <p style="line-height:1.5">${body}</p>
  <p><a href="${url}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${cta}</a></p>
  <p style="color:#6b6b7b;font-size:13px">Si el botón no funciona, copia este enlace:<br>${url}</p>
  <p style="color:#6b6b7b;font-size:13px">Si no has pedido esto, ignora este correo.</p>
</div>`;

export function sendVerifyEmail(to: string, url: string) {
  return send(to, "Confirma tu correo en LinkHub",
    layout("Confirma tu correo", "Pulsa el botón para confirmar que este correo es tuyo. El enlace caduca en 24 horas.", "Confirmar correo", url),
    `Confirma tu correo en LinkHub: ${url}`);
}

export function sendResetEmail(to: string, url: string) {
  return send(to, "Restablece tu contraseña de LinkHub",
    layout("Restablece tu contraseña", "Pulsa el botón para elegir una contraseña nueva. El enlace caduca en 1 hora y solo sirve una vez.", "Elegir contraseña nueva", url),
    `Restablece tu contraseña de LinkHub: ${url}`);
}
