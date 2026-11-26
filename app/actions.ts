"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { getPlatform } from "@/lib/platforms";
import { deleteObject, keyFromUrl, mediaUrl, putObject } from "@/lib/storage";
import { clear, clientKey, hit, waitMessage } from "@/lib/rateLimit";
import { embedPlatform } from "@/lib/embeds";
import { REPORT_REASONS, checkUrl, isAdmin, normalizeHost } from "@/lib/moderation";
import { createToken, emailEnabled, sendResetEmail, sendVerifyEmail, useToken } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import { contactSchema, customStyleSchema, linkOptionsSchema, linkSchema, profileSchema, registerSchema, usernameSchema } from "@/lib/validation";

const err = (path: string, msg: string) => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function register(form: FormData) {
  const wait = await hit(`register:ip:${clientKey()}`, 10, 3600); // 10 cuentas por hora y conexión (varias personas pueden compartir IP)
  if (wait) return err("/register", waitMessage(wait));
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return err("/register", parsed.error.issues[0].message);
  const { email, username, password } = parsed.data;

  const exists = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) return err("/register", exists.email === email ? "Ese correo ya está registrado" : "Ese usuario ya existe");

  const user = await db.user.create({
    data: { email, username, displayName: username, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id, user.sessionVersion);
  if (emailEnabled()) {
    const token = await createToken(user.id, "verify");
    await sendVerifyEmail(email, `${siteUrl()}/verify?token=${token}`).catch(() => false);
  }
  redirect("/dashboard");
}

export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  // 20 intentos por conexión y 8 por cuenta cada 15 minutos
  const wait = Math.max(await hit(`login:ip:${clientKey()}`, 20, 900), await hit(`login:email:${email}`, 8, 900));
  if (wait) return err("/login", waitMessage(wait));
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return err("/login", "Correo o contraseña incorrectos");
  await clear(`login:email:${email}`);
  await createSession(user.id, user.sessionVersion);
  redirect("/dashboard");
}

export async function logout() {
  destroySession();
  redirect("/");
}

export async function updateProfile(form: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return err("/dashboard", parsed.error.issues[0].message);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath(`/${user.username}`);
  redirect("/dashboard?ok=Perfil guardado");
}

export async function addLink(form: FormData) {
  const user = await requireUser();
  const parsed = linkSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return err("/dashboard", parsed.error.issues[0].message);
  const { platform, url } = parsed.data;
  const title = parsed.data.title || getPlatform(platform).name;
  const count = await db.link.count({ where: { userId: user.id } });
  if (count >= 50) return err("/dashboard", "Máximo 50 enlaces por perfil");
  const opts = linkOptionsSchema.parse(Object.fromEntries(form));
  const emb = resolveEmbed(opts, url, platform);
  if (emb.error) return err("/dashboard", emb.error);
  const unsafe = await checkUrl(url);
  if (unsafe) return err("/dashboard", unsafe);
  await db.link.create({ data: { userId: user.id, title, url, position: count, ...opts, platform: emb.platform! } });
  revalidatePath(`/${user.username}`);
  redirect("/dashboard");
}

async function ownedLink(userId: string, id: string) {
  const link = await db.link.findFirst({ where: { id, userId } });
  if (!link) err("/dashboard", "Enlace no encontrado");
  return link!;
}

export async function deleteLink(form: FormData) {
  const user = await requireUser();
  const link = await ownedLink(user.id, String(form.get("id")));
  await db.link.delete({ where: { id: link.id } });
  await removeStored(link.thumbnailUrl);
  // Compacta posiciones
  const rest = await db.link.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } });
  await db.$transaction(rest.map((l, i) => db.link.update({ where: { id: l.id }, data: { position: i } })));
  revalidatePath(`/${user.username}`);
  redirect("/dashboard");
}

export async function toggleLink(form: FormData) {
  const user = await requireUser();
  const link = await ownedLink(user.id, String(form.get("id")));
  await db.link.update({ where: { id: link.id }, data: { active: !link.active } });
  revalidatePath(`/${user.username}`);
  redirect("/dashboard");
}

export async function moveLink(form: FormData) {
  const user = await requireUser();
  const dir = form.get("dir") === "up" ? -1 : 1;
  const links = await db.link.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } });
  const i = links.findIndex((l) => l.id === form.get("id"));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= links.length) redirect("/dashboard");
  [links[i], links[j]] = [links[j], links[i]];
  await db.$transaction(links.map((l, idx) => db.link.update({ where: { id: l.id }, data: { position: idx } })));
  revalidatePath(`/${user.username}`);
  redirect("/dashboard");
}

// ---------- Imágenes (foto de perfil y banner) ----------

const IMAGE_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif" };
const MAX_BYTES = 4 * 1024 * 1024;
type ImageKind = "avatar" | "banner" | "thumb";
const FIELD: Record<Exclude<ImageKind, "thumb">, "avatarUrl" | "bannerUrl"> = { avatar: "avatarUrl", banner: "bannerUrl" };

async function removeStored(url: string) {
  const key = keyFromUrl(url);
  if (key) await deleteObject(key).catch(() => {}); // si ya no existe, da igual
}

export async function uploadImage(form: FormData): Promise<{ error?: string; url?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  const kind = form.get("kind") as ImageKind;
  const file = form.get("file");
  if (!(kind in FIELD) && kind !== "thumb") return { error: "Tipo de imagen no válido" };
  // Miniatura de un enlace: comprobar que es suyo
  const link = kind === "thumb" ? await db.link.findFirst({ where: { id: String(form.get("linkId")), userId: user.id } }) : null;
  if (kind === "thumb" && !link) return { error: "Enlace no encontrado" };
  if (!(file instanceof File) || file.size === 0) return { error: "No se recibió ninguna imagen" };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Formato no admitido. Usa JPG, PNG, WebP o GIF." };
  if (file.size > MAX_BYTES) return { error: "La imagen pesa demasiado (máximo 4 MB)" };

  const key = `${user.id}/${kind}-${randomUUID()}.${ext}`;
  await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
  const url = mediaUrl(key);
  if (link) {
    await db.link.update({ where: { id: link.id }, data: { thumbnailUrl: url } });
    await removeStored(link.thumbnailUrl);
  } else {
    const field = FIELD[kind as keyof typeof FIELD];
    await db.user.update({ where: { id: user.id }, data: { [field]: url } });
    await removeStored(user[field]);
  }
  revalidatePath(`/${user.username}`);
  revalidatePath("/dashboard");
  return { url };
}

export async function removeImage(form: FormData) {
  const user = await requireUser();
  const kind = form.get("kind") as ImageKind;
  if (kind === "thumb") {
    const link = await ownedLink(user.id, String(form.get("linkId")));
    await db.link.update({ where: { id: link.id }, data: { thumbnailUrl: "" } });
    await removeStored(link.thumbnailUrl);
  } else {
    if (!(kind in FIELD)) redirect("/dashboard");
    const field = FIELD[kind as keyof typeof FIELD];
    await db.user.update({ where: { id: user.id }, data: { [field]: "" } });
    await removeStored(user[field]);
  }
  revalidatePath(`/${user.username}`);
  redirect("/dashboard");
}

// ---------- Editar enlace ----------

export async function updateLink(form: FormData) {
  const user = await requireUser();
  const link = await ownedLink(user.id, String(form.get("id")));
  const parsed = linkSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return err("/dashboard", parsed.error.issues[0].message);
  const { platform, url } = parsed.data;
  const title = parsed.data.title || getPlatform(platform).name;
  const opts = linkOptionsSchema.parse(Object.fromEntries(form));
  const emb = resolveEmbed(opts, url, platform);
  if (emb.error) return err("/dashboard", emb.error);
  const unsafe = await checkUrl(url);
  if (unsafe) return err("/dashboard", unsafe);
  await db.link.update({ where: { id: link.id }, data: { url, title, ...opts, platform: emb.platform! } });
  revalidatePath(`/${user.username}`);
  redirect("/dashboard?ok=Enlace actualizado");
}

// ---------- Cuenta ----------

export async function changeUsername(form: FormData) {
  const user = await requireUser();
  const parsed = usernameSchema.safeParse(form.get("username"));
  if (!parsed.success) return err("/dashboard", parsed.error.issues[0].message);
  const username = parsed.data;
  if (username === user.username) redirect("/dashboard");
  if (await db.user.findUnique({ where: { username } })) return err("/dashboard", "Ese usuario ya existe");
  await db.user.update({ where: { id: user.id }, data: { username } });
  revalidatePath(`/${user.username}`);
  revalidatePath(`/${username}`);
  redirect(`/dashboard?ok=${encodeURIComponent(`Tu nuevo enlace es /${username}`)}`);
}

export async function deleteAccount(form: FormData) {
  const user = await requireUser();
  const password = String(form.get("password") ?? "");
  if (!(await bcrypt.compare(password, user.passwordHash))) return err("/dashboard", "Contraseña incorrecta: la cuenta no se ha borrado");
  // Primero las imágenes del almacenamiento, luego el usuario (sus enlaces se borran en cascada)
  const thumbs = await db.link.findMany({ where: { userId: user.id }, select: { thumbnailUrl: true } });
  await Promise.all([user.avatarUrl, user.bannerUrl, ...thumbs.map((t) => t.thumbnailUrl)].map(removeStored));
  await db.user.delete({ where: { id: user.id } });
  revalidatePath(`/${user.username}`);
  destroySession();
  redirect("/?ok=Cuenta eliminada");
}

// ---------- Personalización ----------

export async function updateStyle(form: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(form) as Record<string, string>;
  // Un color solo se aplica si su casilla "usar color propio" está marcada
  for (const k of ["colorButton", "colorButtonText", "colorText", "colorBg", "colorBg2"]) {
    if (raw[`use_${k}`] !== "on") raw[k] = "";
  }
  if (!raw.colorBg) raw.colorBg2 = "";
  const data = customStyleSchema.parse(raw);
  await db.user.update({ where: { id: user.id }, data });
  revalidatePath(`/${user.username}`);
  redirect("/dashboard?ok=Estilo guardado#estilo");
}

// ---------- Reordenar arrastrando ----------

export async function reorderLinks(ids: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión caducada" };
  const links = await db.link.findMany({ where: { userId: user.id }, select: { id: true } });
  const mine = new Set(links.map((l) => l.id));
  if (ids.length !== mine.size || !ids.every((id) => mine.has(id))) return { error: "Orden no válido" };
  await db.$transaction(ids.map((id, position) => db.link.update({ where: { id }, data: { position } })));
  revalidatePath(`/${user.username}`);
  return {};
}

// ---------- Contacto ----------

export async function updateContact(form: FormData) {
  const user = await requireUser();
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return err("/dashboard", parsed.error.issues[0].message);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath(`/${user.username}`);
  redirect("/dashboard?ok=Contacto guardado#contacto");
}

/** Para "contenido incrustado", la plataforma sale de la URL. Devuelve error si no se admite. */
function resolveEmbed(opts: { kind: string }, url: string, platform: string) {
  if (opts.kind !== "embed") return { platform };
  const p = embedPlatform(url);
  return p ? { platform: p } : { error: "Para incrustar usa un enlace de YouTube, Spotify, Twitch o Kick" };
}

// ---------- Reportes ----------

export async function reportProfile(form: FormData) {
  const username = String(form.get("username") ?? "").toLowerCase();
  const back = `/${username}/reportar`;
  const target = await db.user.findUnique({ where: { username } });
  if (!target) redirect("/");
  const reason = String(form.get("reason") ?? "");
  if (!REPORT_REASONS.some((r) => r.id === reason)) return err(back, "Elige un motivo");
  const details = String(form.get("details") ?? "").trim().slice(0, 1000);
  const wait = await hit(`report:ip:${clientKey()}`, 5, 3600);
  if (wait) return err(back, waitMessage(wait));
  await db.report.create({ data: { userId: target.id, reason, details } });
  redirect(`${back}?ok=1`);
}

// ---------- Administración ----------

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect("/");
  return user!;
}

export async function resolveReport(form: FormData) {
  await requireAdmin();
  await db.report.update({ where: { id: String(form.get("id")) }, data: { status: "resolved" } });
  revalidatePath("/admin");
  redirect("/admin");
}

export async function setUserFlag(form: FormData) {
  await requireAdmin();
  const flag = form.get("flag");
  if (flag !== "verified" && flag !== "suspended") redirect("/admin");
  const user = await db.user.update({ where: { id: String(form.get("id")) }, data: { [flag]: form.get("value") === "true" } });
  revalidatePath(`/${user.username}`);
  revalidatePath("/admin");
  redirect(`/admin?q=${encodeURIComponent(String(form.get("q") ?? ""))}`);
}

export async function addBlockedDomain(form: FormData) {
  await requireAdmin();
  const host = normalizeHost(String(form.get("host") ?? ""));
  if (!host || !host.includes(".")) return err("/admin", "Dominio no válido");
  await db.blockedDomain.upsert({ where: { host }, create: { host, note: String(form.get("note") ?? "").slice(0, 200) }, update: {} });
  revalidatePath("/admin");
  redirect("/admin?ok=Dominio bloqueado");
}

export async function removeBlockedDomain(form: FormData) {
  await requireAdmin();
  await db.blockedDomain.deleteMany({ where: { host: String(form.get("host")) } });
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------- Correo y contraseña ----------

export async function resendVerification() {
  const user = await requireUser();
  if (!emailEnabled() || user.emailVerified) redirect("/dashboard");
  const wait = await hit(`verify:user:${user.id}`, 3, 3600);
  if (wait) return err("/dashboard", waitMessage(wait));
  const token = await createToken(user.id, "verify");
  const ok = await sendVerifyEmail(user.email, `${siteUrl()}/verify?token=${token}`);
  if (!ok) return err("/dashboard", "No se pudo enviar el correo. Inténtalo más tarde.");
  redirect(`/dashboard?ok=${encodeURIComponent(`Te enviamos un enlace a ${user.email}`)}`);
}

export async function requestReset(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const wait = Math.max(await hit(`reset:ip:${clientKey()}`, 5, 900), await hit(`reset:email:${email}`, 3, 3600));
  if (wait) return err("/reset", waitMessage(wait));
  const user = await db.user.findUnique({ where: { email } });
  if (user && emailEnabled()) {
    const token = await createToken(user.id, "reset");
    await sendResetEmail(email, `${siteUrl()}/reset?token=${token}`).catch(() => false);
  }
  // Siempre el mismo mensaje: no revelamos qué correos están registrados
  redirect("/reset?sent=1");
}

export async function resetPassword(form: FormData) {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const back = `/reset?token=${encodeURIComponent(token)}`;
  if (password.length < 8) return err(back, "La contraseña debe tener al menos 8 caracteres");
  if (password !== form.get("confirm")) return err(back, "Las contraseñas no coinciden");
  const user = await useToken(token, "reset");
  if (!user) return err("/reset", "El enlace no es válido o ha caducado. Pide uno nuevo.");
  // Cambia la contraseña, confirma el correo (lo ha demostrado) y cierra las demás sesiones
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 }, emailVerified: user.emailVerified ?? new Date() },
  });
  await clear(`login:email:${user.email}`);
  await createSession(updated.id, updated.sessionVersion);
  redirect("/dashboard?ok=Contraseña cambiada");
}

export async function changePassword(form: FormData) {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const password = String(form.get("password") ?? "");
  if (!(await bcrypt.compare(current, user.passwordHash))) return err("/dashboard", "La contraseña actual no es correcta");
  if (password.length < 8) return err("/dashboard", "La contraseña nueva debe tener al menos 8 caracteres");
  const updated = await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), sessionVersion: { increment: 1 } },
  });
  await createSession(updated.id, updated.sessionVersion); // esta sesión sigue; las demás se cierran
  redirect("/dashboard?ok=Contraseña cambiada. Se cerró la sesión en otros dispositivos.");
}
