import { PlatformIcon } from "./PlatformIcon";
import { getPlatform } from "@/lib/platforms";

// Marcas con color muy oscuro (TikTok, X, GitHub...) se vuelven blancas sobre fondos oscuros
function onDark(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40 ? "#ffffff" : `#${hex}`;
}

type Props = {
  user: { username: string; displayName: string; bio: string; avatarUrl: string; theme: string };
  links: { id: string; platform: string; title: string; url: string }[];
  preview?: boolean;
};

export function ProfileView({ user, links, preview }: Props) {
  const initials = user.displayName.slice(0, 2).toUpperCase();
  return (
    <div className={`profile theme-${user.theme}${preview ? " is-preview" : ""}`}>
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

        <ul className="links">
          {links.map((l) => {
            const p = getPlatform(l.platform);
            return (
              <li key={l.id}>
                <a
                  className="link-btn"
                  href={preview ? l.url : `/go/${l.id}`}
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
          {links.length === 0 && <li className="empty">Todavía no hay enlaces.</li>}
        </ul>
        <footer className="brandmark">Hecho con <a href="/">LinkHub</a></footer>
      </div>
    </div>
  );
}
