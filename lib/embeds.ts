// Contenido incrustado para creadores: YouTube (último vídeo), Spotify, Twitch y Kick.

export const EMBED_PLATFORMS = ["youtube", "spotify", "twitch", "kick"] as const;
export type EmbedPlatform = (typeof EMBED_PLATFORMS)[number];

/** Detecta la plataforma a partir de la URL pegada. */
export function embedPlatform(url: string): EmbedPlatform | null {
  let host = "";
  try { host = new URL(url).hostname.replace(/^(www|m|music|open)\./, ""); } catch { return null; }
  if (host === "youtube.com" || host === "youtu.be") return "youtube";
  if (host === "spotify.com") return "spotify";
  if (host === "twitch.tv") return "twitch";
  if (host === "kick.com") return "kick";
  return null;
}

/** Primer segmento de la ruta (nombre del canal en Twitch/Kick). */
export function channelSlug(url: string) {
  try { return new URL(url).pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? ""; } catch { return ""; }
}

const YT_VIDEO = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/;

export type YtVideo = { id: string; title: string; published: string };

const decode = (t: string) =>
  t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/**
 * Vídeos a mostrar: si la URL es un vídeo, solo ese; si es un canal, sus últimos
 * vídeos (hasta 12) desde su feed RSS público, sin claves.
 */
export async function youtubeVideos(url: string): Promise<{ single?: string; videos?: YtVideo[]; channelUrl?: string } | null> {
  const direct = url.match(YT_VIDEO)?.[1];
  if (direct) return { single: direct };
  try {
    let channelId = url.match(/\/channel\/(UC[\w-]{22})/)?.[1];
    if (!channelId) {
      // @usuario, /c/ o /user/: la página del canal incluye su ID
      const page = await fetch(url, { headers: { "accept-language": "es", cookie: "CONSENT=YES+1" }, next: { revalidate: 86400 } });
      const html = await page.text();
      channelId = html.match(/"(?:externalId|channelId)":"(UC[\w-]{22})"/)?.[1] ?? html.match(/channel\/(UC[\w-]{22})/)?.[1];
    }
    if (!channelId) return null;
    const feed = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { next: { revalidate: 1800 } })).text();
    const videos = [...feed.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 12).flatMap(([, e]) => {
      const id = e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
      return id ? [{ id, title: decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""), published: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? "" }] : [];
    });
    return videos.length ? { videos, channelUrl: url } : null;
  } catch {
    return null;
  }
}

/** URL del reproductor de Spotify y su altura (compacto para canciones). */
export function spotifyEmbed(url: string) {
  const m = url.match(/spotify\.com\/(?:intl-\w+\/)?(track|album|playlist|artist|show|episode)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === "track" || m[1] === "episode" ? 152 : 352 };
}
