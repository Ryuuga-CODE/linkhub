import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { track } from "@/lib/track";
import { checkUrl } from "@/lib/moderation";

// Redirige al enlace real y cuenta el clic
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const link = await db.link.findUnique({ where: { id: params.id }, include: { user: { select: { suspended: true } } } });
  if (!link || !link.active || link.user.suspended) return NextResponse.redirect(new URL("/", req.url));
  // Se vuelve a comprobar al hacer clic: un dominio bloqueado después deja de funcionar
  if (await checkUrl(link.url)) return NextResponse.redirect(new URL("/bloqueado", req.url));
  await db.link.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } });
  track(link.userId, "click", link.id);
  return NextResponse.redirect(link.url, 302);
}
