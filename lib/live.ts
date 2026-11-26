// ¿Está en directo? Twitch con la API oficial (si hay credenciales) y Kick con su API pública.

let twitchToken: { value: string; exp: number } | null = null;

async function twitchAppToken() {
  const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (twitchToken && twitchToken.exp > Date.now() + 60_000) return twitchToken.value;
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: "POST", cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token: string; expires_in: number };
  twitchToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return twitchToken.value;
}

async function twitchLive(logins: string[]): Promise<Set<string>> {
  const token = await twitchAppToken().catch(() => null);
  if (!token || logins.length === 0) return new Set();
  const qs = logins.slice(0, 100).map((l) => `user_login=${encodeURIComponent(l)}`).join("&");
  const res = await fetch(`https://api.twitch.tv/helix/streams?${qs}`, {
    headers: { "Client-Id": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  }).catch(() => null);
  if (!res?.ok) return new Set();
  const j = (await res.json()) as { data: { user_login: string }[] };
  return new Set(j.data.map((s) => s.user_login.toLowerCase()));
}

async function kickLive(slug: string): Promise<boolean> {
  // API pública de Kick: a veces la bloquea su protección anti-bots; en ese caso no se muestra el aviso.
  const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; LinkHub/1.0)" },
    next: { revalidate: 60 },
  }).catch(() => null);
  if (!res?.ok) return false;
  try { return !!((await res.json()) as { livestream?: unknown }).livestream; } catch { return false; }
}

/** Conjunto de canales en directo, con claves "twitch:<canal>" y "kick:<canal>". */
export async function liveChannels(channels: { platform: string; slug: string }[]) {
  const tw = [...new Set(channels.filter((c) => c.platform === "twitch" && c.slug).map((c) => c.slug))];
  const kk = [...new Set(channels.filter((c) => c.platform === "kick" && c.slug).map((c) => c.slug))];
  const [twLive, kkLive] = await Promise.all([twitchLive(tw), Promise.all(kk.map(async (s) => [s, await kickLive(s)] as const))]);
  const out = new Set<string>();
  twLive.forEach((s) => out.add(`twitch:${s}`));
  kkLive.forEach(([s, live]) => live && out.add(`kick:${s}`));
  return out;
}
