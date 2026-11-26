import { PlatformIcon } from "./PlatformIcon";
import { getPlatform } from "@/lib/platforms";
import { fontHref, profileStyle, type CustomStyle } from "@/lib/customStyle";
import { headers } from "next/headers";
import { channelSlug, spotifyEmbed, youtubeVideos } from "@/lib/embeds";
import { MediaCarousel } from "./MediaCarousel";
import { MediaPlayer } from "./MediaPlayer";
import { offlineContent, type MediaItem } from "@/lib/streams";
import { liveChannels } from "@/lib/live";
import { adSlotFor } from "@/lib/ads";
import { AdSlot } from "./AdSlot";

// Marcas con color muy oscuro (TikTok, X, GitHub...) se vuelven blancas sobre fondos oscuros
function onDark(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40 ? "#ffffff" : `#${hex}`;
}

type Contact = { contactPhone: string; contactWhatsapp: string; contactEmail: string; contactAddress: string; contactHours: string };
const digits = (v: string) => v.replace(/\D/g, "");

type Props = {
  user: { username: string; displayName: string; bio: string; avatarUrl: string; bannerUrl: string; theme: string; verified?: boolean } & Partial<CustomStyle> & Partial<Contact>;
  links: { id: string; platform: string; title: string; url: string; display?: string; highlight?: boolean; kind?: string; price?: string; thumbnailUrl?: string }[];
  preview?: boolean;
};

export async function ProfileView({ user, links, preview }: Props) {
  const initials = user.displayName.slice(0, 2).toUpperCase();
  const icons = links.filter((l) => l.display === "icon");
  const buttons = links.filter((l) => l.display !== "icon");
  const href = (l: { id: string; url: string }) => (preview ? l.url : `/go/${l.id}`);
  const custom = profileStyle(user);
  const font = fontHref(user.font ?? "");
  const ad = preview ? null : adSlotFor("profile");
  // Aviso de "en directo" para enlaces de Twitch y Kick
  const live = await liveChannels(links.map((l) => ({ platform: l.platform, slug: channelSlug(l.url) })));
  const isLive = (l: { platform: string; url: string }) => live.has(`${l.platform}:${channelSlug(l.url)}`);
  return (
    <div
      className={`profile theme-${user.theme}${preview ? " is-preview" : ""}${user.bannerUrl ? " has-banner" : ""} ${custom.className}`}
      style={custom.vars as React.CSSProperties}
    >
      {font && <link rel="stylesheet" href={font} />}
      {user.bannerUrl && <div className="banner" style={{ backgroundImage: `url("${user.bannerUrl}")` }} aria-hidden />}
      <div className="profile-inner">
        <div className="profile-side">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src={user.avatarUrl} alt={user.displayName} />
        ) : (
          <div className="avatar avatar-initials">{initials}</div>
        )}
        <h1 className="name">
          {user.displayName}
          {user.verified && (
            <svg className="verified" viewBox="0 0 24 24" width="22" height="22" role="img" aria-label="Perfil verificado">
              <title>Perfil verificado</title>
              <path fill="#1d9bf0" d="M22.5 12.5c0-1.58-.88-2.95-2.16-3.6.15-.44.23-.92.23-1.4 0-2.21-1.71-4-3.82-4-.47 0-.92.08-1.34.25C14.79 2.5 13.47 1.5 12 1.5s-2.79 1-3.41 2.25c-.42-.17-.87-.25-1.34-.25-2.11 0-3.82 1.79-3.82 4 0 .48.08.96.23 1.4-1.28.65-2.16 2.02-2.16 3.6 0 1.5.8 2.8 1.97 3.48-.03.17-.04.35-.04.52 0 2.21 1.71 4 3.82 4 .47 0 .92-.09 1.34-.25.62 1.25 1.94 2.25 3.41 2.25s2.79-1 3.41-2.25c.42.16.87.25 1.34.25 2.11 0 3.82-1.79 3.82-4 0-.17-.01-.35-.04-.52 1.17-.68 1.97-1.98 1.97-3.48z" />
              <path fill="#fff" d="M10.6 16.2 6.9 12.6l1.4-1.4 2.3 2.3 5.1-5.2 1.4 1.4z" />
            </svg>
          )}
        </h1>
        <p className="handle">@{user.username}</p>
        {user.bio && <p className="bio">{user.bio}</p>}

        {icons.length > 0 && (
          <ul className="social-row">
            {icons.map((l) => {
              const p = getPlatform(l.platform);
              return (
                <li key={l.id}>
                  <a
                    className={`social-icon${l.highlight ? " is-highlight" : ""}${isLive(l) ? " is-live" : ""}`}
                    href={href(l)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={l.title}
                    aria-label={l.title}
                    style={{ ["--brand" as string]: `#${p.color}`, ["--brand-on-dark" as string]: onDark(p.color) }}
                  >
                    <PlatformIcon platform={l.platform} size={24} />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <div className="contact-desktop"><ContactCard user={user} preview={preview} /></div>
        </div>

        <div className="profile-main">
        <ul className="links">
          {buttons.map((l) => {
            const p = getPlatform(l.platform);
            const style = { ["--brand" as string]: `#${p.color}`, ["--brand-on-dark" as string]: onDark(p.color) };
            if (l.kind === "embed") {
              return (
                <li key={l.id}>
                  <Embed link={l} live={isLive(l)} preview={preview} />
                </li>
              );
            }
            if (l.kind === "product") {
              return (
                <li key={l.id}>
                  <a className={`product-card${l.highlight ? " is-highlight" : ""}`} href={href(l)} target="_blank" rel="noopener noreferrer" style={style}>
                    {l.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="product-img" src={l.thumbnailUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="product-img product-img-empty"><PlatformIcon platform={l.platform} size={28} /></span>
                    )}
                    <span className="product-info">
                      <span className="product-title">{l.title}</span>
                      {l.price && <span className="product-price">{l.price}</span>}
                      <span className="product-cta">Comprar →</span>
                    </span>
                  </a>
                </li>
              );
            }
            return (
              <li key={l.id}>
                <a className={`link-btn${l.highlight ? " is-highlight" : ""}${l.thumbnailUrl ? " has-thumb" : ""}`} href={href(l)} target="_blank" rel="noopener noreferrer" style={style}>
                  <span className="link-icon">
                    {l.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="link-thumb" src={l.thumbnailUrl} alt="" loading="lazy" />
                    ) : (
                      <PlatformIcon platform={l.platform} />
                    )}
                  </span>
                  <span className="link-title">{l.title}</span>
                  {isLive(l) && <span className="live-badge">EN DIRECTO</span>}
                </a>
              </li>
            );
          })}
          {buttons.length === 0 && icons.length === 0 && <li className="empty">Todavía no hay enlaces.</li>}
        </ul>
        <div className="contact-mobile"><ContactCard user={user} preview={preview} /></div>
        {ad && <AdSlot {...ad} className="ad-profile" />}
        </div>

        <footer className="brandmark">
          Hecho con <a href="/">LinkHub</a>
          {!preview && <> · <a href={`/${user.username}/reportar`} rel="nofollow">Reportar</a> · <a href="/privacidad">Privacidad</a></>}
        </footer>
      </div>
    </div>
  );
}

function ContactCard({ user, preview }: { user: Partial<Contact> & { username: string }; preview?: boolean }) {
  const { contactPhone: phone, contactWhatsapp: wa, contactEmail: email, contactAddress: address, contactHours: hours } = user;
  if (!phone && !wa && !email && !address && !hours) return null;
  const actions = [
    phone && { href: `tel:${phone.replace(/[^+\d]/g, "")}`, label: "Llamar", icon: "📞" },
    wa && { href: `https://wa.me/${digits(wa)}`, label: "WhatsApp", icon: "💬" },
    email && { href: `mailto:${email}`, label: "Correo", icon: "✉️" },
    address && { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, label: "Cómo llegar", icon: "📍" },
  ].filter(Boolean) as { href: string; label: string; icon: string }[];
  return (
    <section className="contact-card" aria-label="Contacto">
      {actions.length > 0 && (
        <div className="contact-actions">
          {actions.map((a) => (
            <a key={a.label} href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
              <span aria-hidden>{a.icon}</span>{a.label}
            </a>
          ))}
        </div>
      )}
      {address && <p className="contact-line">📍 {address}</p>}
      {hours && <p className="contact-line">🕒 {hours}</p>}
      <a className="contact-save" href={preview ? undefined : `/${user.username}/contacto.vcf`}>👤 Guardar contacto</a>
    </section>
  );
}

/** Reproductor incrustado; si no se puede, cae a un botón normal. */
async function Embed({ link, live, preview }: { link: { platform: string; url: string; title: string }; live: boolean; preview?: boolean }) {
  const title = (
    <p className="embed-title">
      <PlatformIcon platform={link.platform} size={16} /> {link.title}
      {live && <span className="live-badge">EN DIRECTO</span>}
    </p>
  );
  if (link.platform === "youtube") {
    const yt = await youtubeVideos(link.url);
    if (yt?.videos) {
      const ago = (iso: string) => {
        const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
        return d < 1 ? "hoy" : d < 30 ? `hace ${d} ${d === 1 ? "día" : "días"}` : d < 365 ? `hace ${Math.floor(d / 30)} ${Math.floor(d / 30) === 1 ? "mes" : "meses"}` : `hace ${Math.floor(d / 365)} ${Math.floor(d / 365) === 1 ? "año" : "años"}`;
      };
      const items: MediaItem[] = yt.videos.map((v) => ({
        id: v.id, title: v.title, thumb: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, player: "iframe",
        src: `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1`, meta: ago(v.published), href: `https://www.youtube.com/watch?v=${v.id}`,
      }));
      return (
        <div className="embed embed-wide">{title}
          <MediaCarousel items={items} more={yt.channelUrl ? { href: yt.channelUrl, label: "Ver todo el canal" } : undefined} />
        </div>
      );
    }
    if (yt?.single) return (
      <div className="embed">{title}
        <iframe className="embed-video" src={`https://www.youtube-nocookie.com/embed/${yt.single}`} title={link.title} loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    );
  }
  if (link.platform === "spotify") {
    const sp = spotifyEmbed(link.url);
    if (sp) return (
      <div className="embed">{title}
        <iframe className="embed-audio" src={sp.src} height={sp.height} title={link.title} loading="lazy" allow="encrypted-media; clipboard-write; fullscreen" />
      </div>
    );
  }
  const slug = channelSlug(link.url);
  const host = (headers().get("x-forwarded-host") ?? headers().get("host") ?? "localhost").split(":")[0];
  if ((link.platform === "twitch" || link.platform === "kick") && slug && !live) {
    const off = await offlineContent(link.platform, slug, host);
    if (off) {
      const channel = link.platform === "kick" ? `https://kick.com/${slug}` : `https://www.twitch.tv/${slug}`;
      return (
        <div className="embed embed-wide embed-offline">{title}
          {off.lastStream && (
            <section className="offline-block">
              <p className="offline-label"><span className="offline-dot" aria-hidden /> Sin directo ahora · <strong>Último directo</strong></p>
              <MediaPlayer item={off.lastStream} large />
              <a className="car-title" href={off.lastStream.href} target="_blank" rel="noopener noreferrer">{off.lastStream.title}</a>
              <p className="car-meta">{off.lastStream.meta}</p>
            </section>
          )}
          {off.clips.length > 0 && (
            <section className="offline-block">
              <p className="offline-label">🎬 <strong>Clips destacados</strong></p>
              <MediaCarousel items={off.clips} more={{ href: `${channel}/clips`, label: "Ver más clips" }} />
            </section>
          )}
        </div>
      );
    }
  }
  if (link.platform === "twitch" && slug) {
    return (
      <div className="embed embed-stream">{title}
        <div className="stream-row">
          <iframe className="embed-video" src={`https://player.twitch.tv/?channel=${slug}&parent=${host}&muted=true&autoplay=false`} title={link.title} loading="lazy" allowFullScreen />
          {/* Chat al lado solo en pantallas anchas (se oculta por CSS y, oculto, no se carga) */}
          {!preview && <iframe className="stream-chat" src={`https://www.twitch.tv/embed/${slug}/chat?parent=${host}&darkpopout`} title={`Chat de ${slug}`} loading="lazy" />}
        </div>
      </div>
    );
  }
  if (link.platform === "kick" && slug) {
    return (
      <div className="embed embed-stream">{title}
        <iframe className="embed-video" src={`https://player.kick.com/${slug}?muted=true&autoplay=false`} title={link.title} loading="lazy" allowFullScreen />
      </div>
    );
  }
  return (
    <a className="link-btn" href={link.url} target="_blank" rel="noopener noreferrer">
      <span className="link-icon"><PlatformIcon platform={link.platform} /></span>
      <span className="link-title">{link.title}</span>
    </a>
  );
}
