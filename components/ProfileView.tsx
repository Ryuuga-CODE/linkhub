import { PlatformIcon } from "./PlatformIcon";
import { getPlatform } from "@/lib/platforms";
import { fontHref, profileStyle, type CustomStyle } from "@/lib/customStyle";

// Marcas con color muy oscuro (TikTok, X, GitHub...) se vuelven blancas sobre fondos oscuros
function onDark(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40 ? "#ffffff" : `#${hex}`;
}

type Props = {
  user: { username: string; displayName: string; bio: string; avatarUrl: string; bannerUrl: string; theme: string } & Partial<CustomStyle>;
  links: { id: string; platform: string; title: string; url: string; display?: string; highlight?: boolean }[];
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
            return (
              <li key={l.id}>
                <a
                  className={`link-btn${l.highlight ? " is-highlight" : ""}`}
                  href={href(l)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ["--brand" as string]: `#${p.color}`, ["--brand-on-dark" as string]: onDark(p.color) }}
                >
                  <span className="link-icon"><PlatformIcon platform={l.platform} /></span>
                  <span className="link-title">{l.title}</span>
                </a>
              </li>
            );
          })}
          {buttons.length === 0 && icons.length === 0 && <li className="empty">Todavía no hay enlaces.</li>}
        </ul>
        <footer className="brandmark">Hecho con <a href="/">LinkHub</a></footer>
      </div>
    </div>
  );
}
