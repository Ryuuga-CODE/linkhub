import { headers } from "next/headers";
import { waitUntil } from "@vercel/functions";
import { db } from "./db";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|embedly|curl|wget|python|axios|node-fetch|headless/i;

function device(ua: string) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** De dónde llega la visita: app de la red social (navegador integrado) o web que enlaza. */
function source(ua: string, referer: string | null, ownHost: string | null) {
  if (/instagram/i.test(ua)) return "Instagram";
  if (/musical_ly|bytedance|tiktok/i.test(ua)) return "TikTok";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/twitter/i.test(ua)) return "X";
  if (/snapchat/i.test(ua)) return "Snapchat";
  if (referer) {
    try {
      const host = new URL(referer).hostname.replace(/^(www|m|l|lm)\./, "");
      if (host && host !== ownHost) return host;
    } catch { /* referer inválido */ }
  }
  return "Directo";
}

/**
 * Registra una visita o un clic sin retrasar la respuesta (waitUntil en Vercel).
 * Ignora bots y vistas previas de enlaces.
 */
export function track(userId: string, type: "view" | "click", linkId?: string) {
  const h = headers();
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;
  const data = {
    userId,
    type,
    linkId: linkId ?? null,
    country: h.get("x-vercel-ip-country") ?? "",
    device: device(ua),
    source: source(ua, h.get("referer"), h.get("host")),
  };
  waitUntil(db.event.create({ data }).catch((e) => console.error("track", e)));
}
