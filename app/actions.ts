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
import { contactSchema, customStyleSchema, linkOptionsSchema, linkSchema, profileSchema, registerSchema, usernameSchema } from "@/lib/validation";

const err = (path: string, msg: string) => redirect(`${path}?error=${encodeURIComponent(msg)}`);

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
  await createSession(user.id);
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
  await createSession(user.id);
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
  await db.link.create({ data: { userId: user.id, platform, title, url, position: count, ...opts } });
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
  await db.link.update({ where: { id: link.id }, data: { platform, url, title, ...opts } });
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
