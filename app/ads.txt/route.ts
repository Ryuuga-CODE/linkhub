import { adsConfig } from "@/lib/ads";

// ads.txt: declara qué cuenta de AdSense puede vender anuncios en este dominio
export function GET() {
  const cfg = adsConfig();
  if (!cfg) return new Response("", { status: 404 });
  const pub = cfg.client.replace(/^ca-/, "");
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
