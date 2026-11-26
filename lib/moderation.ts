import { db } from "./db";

// Servicios conocidos para registrar la IP de quien hace clic (se usan para doxxing y estafas)
const BUILTIN_BLOCKED = [
  "grabify.link", "iplogger.org", "iplogger.com", "iplogger.ru", "iplogger.co", "iplogger.info",
  "2no.co", "yip.su", "blasze.com", "ps3cfw.com", "bmwforum.co", "leancoding.co", "spottyfly.com",
  "stopify.co", "quickmessage.us", "joinmy.site", "datasig.io", "datauth.io", "ipgrabber.ru",
  "ipgraber.ru", "iplis.ru", "02ip.ru", "ezstat.ru", "whatstheirip.com", "hondachat.com", "bvog.com",
];

export const REPORT_REASONS = [
  { id: "scam", label: "Estafa o enlaces engañosos (phishing)" },
  { id: "impersonation", label: "Se hace pasar por otra persona o marca" },
  { id: "inappropriate", label: "Contenido inapropiado o ilegal" },
  { id: "spam", label: "Spam" },
  { id: "other", label: "Otro motivo" },
];

export function isAdmin(user: { email: string } | null | undefined) {
  if (!user) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(user.email.toLowerCase());
}

export function normalizeHost(input: string) {
  const raw = input.trim().toLowerCase();
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** El dominio y todos sus dominios padre: a.b.example.com → [a.b.example.com, b.example.com, example.com] */
function hostChain(host: string) {
  const parts = host.split(".");
  return parts.slice(0, -1).map((_, i) => parts.slice(i).join("."));
}

/** Comprobación opcional con Google Safe Browsing (si hay GOOGLE_SAFE_BROWSING_KEY). */
async function safeBrowsing(url: string): Promise<boolean> {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!key) return false;
  const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client: { clientId: "linkhub", clientVersion: "1.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }],
      },
    }),
    next: { revalidate: 3600 },
  }).catch(() => null);
  if (!res?.ok) return false;
  const j = (await res.json()) as { matches?: unknown[] };
  return !!j.matches?.length;
}

/** Devuelve un motivo si la URL no se permite; null si está bien. */
export async function checkUrl(url: string): Promise<string | null> {
  if (url.startsWith("mailto:")) return null;
  const host = normalizeHost(url);
  if (!host) return "URL no válida";
  const chain = hostChain(host);
  if (chain.some((h) => BUILTIN_BLOCKED.includes(h))) return "Ese sitio no está permitido (registra la IP de quien hace clic)";
  const blocked = await db.blockedDomain.findFirst({ where: { host: { in: chain } } });
  if (blocked) return "Ese dominio está bloqueado por seguridad";
  if (await safeBrowsing(url)) return "Google marca ese enlace como peligroso";
  return null;
}
