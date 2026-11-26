import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { useToken } from "@/lib/email";

// Enlace del correo de verificación
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const user = await useToken(token, "verify");
  if (!user) return NextResponse.redirect(new URL("/dashboard?error=" + encodeURIComponent("El enlace de verificación no es válido o ha caducado"), req.url));
  await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  return NextResponse.redirect(new URL("/dashboard?ok=" + encodeURIComponent("¡Correo confirmado!"), req.url));
}
