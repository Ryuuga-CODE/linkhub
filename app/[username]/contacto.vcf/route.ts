import { db } from "@/lib/db";

// Escapa texto para vCard 3.0
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Tarjeta de contacto (.vcf) para guardar el perfil en la agenda del móvil. */
export async function GET(req: Request, { params }: { params: { username: string } }) {
  const user = await db.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!user) return new Response("No encontrado", { status: 404 });
  const url = new URL(`/${user.username}`, req.url).toString();
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(user.displayName)}`,
    `N:${esc(user.displayName)};;;;`,
    user.contactPhone && `TEL;TYPE=CELL:${user.contactPhone.replace(/[^+\d]/g, "")}`,
    user.contactWhatsapp && user.contactWhatsapp !== user.contactPhone && `TEL;TYPE=CELL,WHATSAPP:${user.contactWhatsapp.replace(/[^+\d]/g, "")}`,
    user.contactEmail && `EMAIL;TYPE=INTERNET:${esc(user.contactEmail)}`,
    user.contactAddress && `ADR;TYPE=WORK:;;${esc(user.contactAddress)};;;;`,
    `URL:${url}`,
    user.bio && `NOTE:${esc(user.bio)}`,
    "END:VCARD",
  ].filter(Boolean);
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${user.username}.vcf"`,
    },
  });
}
