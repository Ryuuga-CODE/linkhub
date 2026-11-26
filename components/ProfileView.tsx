import { PlatformIcon } from "./PlatformIcon";
import { getPlatform } from "@/lib/platforms";
import { fontHref, profileStyle, type CustomStyle } from "@/lib/customStyle";

// Marcas con color muy oscuro (TikTok, X, GitHub...) se vuelven blancas sobre fondos oscuros
function onDark(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40 ? "#ffffff" : `#${hex}`;
}

type Contact = { contactPhone: string; contactWhatsapp: string; contactEmail: string; contactAddress: string; contactHours: string };
const digits = (v: string) => v.replace(/\D/g, "");

type Props = {
  user: { username: string; displayName: string; bio: string; avatarUrl: string; bannerUrl: string; theme: string } & Partial<CustomStyle> & Partial<Contact>;
  links: { id: string; platform: string; title: string; url: string; display?: string; highlight?: boolean; kind?: string; price?: string; thumbnailUrl?: string }[];
  preview?: boolean;
};

export function ProfileView({ user, links, preview }: Props) {
  const initials = user.displayName.slice(0, 2).toUpperCase();
  const icons = links.filter((l) => l.display === "icon");
  const buttons = links.filter((l) => l.display !== "icon");
  const href = (l: { id: string; url: string }) => (preview ? l.url : `/go/${l.id}`);
  const custom = profileStyle(user);
  const font = fontHref(user.font ?? "");
  return (
    <div
      className={`profile theme-${user.theme}${preview ? " is-preview" : ""}${user.bannerUrl ? " has-banner" : ""} ${custom.className}`}
      style={custom.vars as React.CSSProperties}
    >
      {font && <link rel="stylesheet" href={font} />}
      {user.bannerUrl && <div className="banner" style={{ backgroundImage: `url("${user.bannerUrl}")` }} aria-hidden />}
      <div className="profile-inner">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src={user.avatarUrl} alt={user.displayName} />
        ) : (
          <div className="avatar avatar-initials">{initials}</div>
        )}
        <h1 className="name">{user.displayName}</h1>
        <p className="handle">@{user.username}</p>
        {user.bio && <p className="bio">{user.bio}</p>}

        {icons.length > 0 && (
          <ul className="social-row">
            {icons.map((l) => {
              const p = getPlatform(l.platform);
              return (
                <li key={l.id}>
                  <a
                    className={`social-icon${l.highlight ? " is-highlight" : ""}`}
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

        <ul className="links">
          {buttons.map((l) => {
            const p = getPlatform(l.platform);
            const style = { ["--brand" as string]: `#${p.color}`, ["--brand-on-dark" as string]: onDark(p.color) };
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
                </a>
              </li>
            );
          })}
          {buttons.length === 0 && icons.length === 0 && <li className="empty">Todavía no hay enlaces.</li>}
        </ul>
        <ContactCard user={user} preview={preview} />
        <footer className="brandmark">Hecho con <a href="/">LinkHub</a></footer>
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
