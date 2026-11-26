import { getObject } from "@/lib/storage";

const KEY_RE = /^[a-z0-9]+\/(avatar|banner|thumb)-[0-9a-f-]{36}\.(webp|jpg|png|gif)$/;

// Sirve las imágenes del bucket. Cada subida usa una clave nueva, así que se
// pueden cachear para siempre en el navegador y en la CDN de Vercel.
export async function GET(_req: Request, { params }: { params: { key: string[] } }) {
  const key = params.key.join("/");
  if (!KEY_RE.test(key)) return new Response("No encontrado", { status: 404 });
  try {
    const obj = await getObject(key);
    const body = await obj.Body!.transformToByteArray();
    return new Response(body, {
      headers: {
        "Content-Type": obj.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === "NoSuchKey" || name === "NotFound") return new Response("No encontrado", { status: 404 });
    throw e;
  }
}
