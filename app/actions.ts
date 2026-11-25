"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { getPlatform } from "@/lib/platforms";
import { linkSchema, profileSchema, registerSchema } from "@/lib/validation";

const err = (path: string, msg: string) => redirect(`${path}?error=${encodeURIComponent(msg)}`);

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function register(form: FormData) {
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
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return err("/login", "Correo o contraseña incorrectos");
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
  await db.link.create({ data: { userId: user.id, platform, title, url, position: count } });
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
