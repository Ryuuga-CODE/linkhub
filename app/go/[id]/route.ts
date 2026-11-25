import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Redirige al enlace real y cuenta el clic
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const link = await db.link.findUnique({ where: { id: params.id } });
  if (!link || !link.active) return NextResponse.redirect(new URL("/", req.url));
  await db.link.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } });
  return NextResponse.redirect(link.url, 302);
}
