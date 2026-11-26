// Contenido de un canal sin directo: último directo grabado y clips destacados.
// Kick: API pública (sin claves). Twitch: API oficial con TWITCH_CLIENT_ID/SECRET.
import { twitchAppToken } from "./live";

export type MediaItem = {
  id: string;
  title: string;
  thumb: string;
  /** "iframe": reproductor de la plataforma; "hls": vídeo .m3u8 reproducido con hls.js */
  player: "iframe" | "hls";
  src: string;
  meta: string; // texto bajo el título (fecha, vistas, duración…)
  href: string; // ver en la plataforma
};

export type OfflineContent = { lastStream: MediaItem | null; clips: MediaItem[] };

const fmtDuration = (sec: number) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
};
const fmtViews = (n: number) => `${Intl.NumberFormat("es", { notation: "compact" }).format(n)} vistas`;
const fmtDate = (d: string) => {
  const date = new Date(d.includes("T") ? d : d.replace(" ", "T") + "Z");
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es", { day: "numeric", month: "short", timeZone: "UTC" });
};

// ---------- Kick ----------

const KICK_HEADERS = { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; LinkHub/1.0)" };

type KickVideo = { session_title: string; is_live: boolean; duration: number; start_time: string; views: number; source: string; thumbnail?: { src?: string }; video?: { uuid?: string } };
type KickClip = { id: string; title: string; clip_url: string; thumbnail_url: string; views: number; duration: number };

async function kickOffline(slug: string): Promise<OfflineContent | null> {
  const get = async <T,>(path: string) => {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}${path}`, { headers: KICK_HEADERS, next: { revalidate: 600 } }).catch(() => null);
    return res?.ok ? ((await res.json()) as T) : null;
  };
  const [videos, month] = await Promise.all([get<KickVideo[]>("/videos"), get<{ clips: KickClip[] }>("/clips?sort=view&time=month")]);
  const clipsRaw = month?.clips?.length ? month.clips : (await get<{ clips: KickClip[] }>("/clips?sort=view&time=all"))?.clips ?? [];
  const last = videos?.find((v) => !v.is_live && v.source);
  const lastStream: MediaItem | null = last
    ? {
        id: last.video?.uuid ?? last.source,
        title: last.session_title,
        thumb: last.thumbnail?.src ?? "",
        player: "hls",
        src: last.source,
        meta: [fmtDate(last.start_time), fmtDuration(Math.round(last.duration / 1000)), fmtViews(last.views)].filter(Boolean).join(" · "),
        href: last.video?.uuid ? `https://kick.com/${slug}/videos/${last.video.uuid}` : `https://kick.com/${slug}`,
      }
    : null;
  const clips: MediaItem[] = clipsRaw.slice(0, 12).map((c) => ({
    id: c.id,
    title: c.title,
    thumb: c.thumbnail_url,
    player: "hls",
    src: c.clip_url,
    meta: `${fmtViews(c.views)} · ${c.duration} s`,
    href: `https://kick.com/${slug}/clips/${c.id}`,
  }));
  return lastStream || clips.length ? { lastStream, clips } : null;
}

// ---------- Twitch ----------

/** "3h2m10s" → segundos */
const twitchSeconds = (d: string) => {
  const m = d.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
};

async function twitchOffline(login: string, host: string): Promise<OfflineContent | null> {
  const token = await twitchAppToken().catch(() => null);
  if (!token) return null; // sin credenciales de Twitch no hay datos
  const helix = async <T,>(path: string) => {
    const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
      headers: { "Client-Id": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
      next: { revalidate: 600 },
    }).catch(() => null);
    return res?.ok ? ((await res.json()) as { data: T[] }).data : [];
  };
  const [user] = await helix<{ id: string }>(`users?login=${encodeURIComponent(login)}`);
  if (!user) return null;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  type TwVideo = { id: string; title: string; thumbnail_url: string; created_at: string; duration: string; view_count: number; url: string };
  type TwClip = { id: string; title: string; thumbnail_url: string; view_count: number; duration: number; url: string };
  const [videos, recentClips] = await Promise.all([
    helix<TwVideo>(`videos?user_id=${user.id}&type=archive&first=1`),
    helix<TwClip>(`clips?broadcaster_id=${user.id}&first=12&started_at=${since}`),
  ]);
  const clipsRaw = recentClips.length ? recentClips : await helix<TwClip>(`clips?broadcaster_id=${user.id}&first=12`);
  const v = videos[0];
  const lastStream: MediaItem | null = v
    ? {
        id: v.id,
        title: v.title,
        thumb: v.thumbnail_url.replace("%{width}", "640").replace("%{height}", "360"),
        player: "iframe",
        src: `https://player.twitch.tv/?video=v${v.id}&parent=${host}&autoplay=true`,
        meta: [fmtDate(v.created_at), fmtDuration(twitchSeconds(v.duration)), fmtViews(v.view_count)].join(" · "),
        href: v.url,
      }
    : null;
  const clips: MediaItem[] = clipsRaw.map((c) => ({
    id: c.id,
    title: c.title,
    thumb: c.thumbnail_url,
    player: "iframe",
    src: `https://clips.twitch.tv/embed?clip=${c.id}&parent=${host}&autoplay=true`,
    meta: `${fmtViews(c.view_count)} · ${Math.round(c.duration)} s`,
    href: c.url,
  }));
  return lastStream || clips.length ? { lastStream, clips } : null;
}

export function offlineContent(platform: string, slug: string, host: string) {
  if (platform === "kick") return kickOffline(slug);
  if (platform === "twitch") return twitchOffline(slug, host);
  return Promise.resolve(null);
}
