import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLATFORMS, getPlatform } from "@/lib/platforms";
import { THEMES } from "@/lib/themes";
import { PlatformIcon } from "@/components/PlatformIcon";
import { ProfileView } from "@/components/ProfileView";
import { ShareButtons } from "@/components/ShareButtons";
import { siteUrl } from "@/lib/site";
import QRCode from "qrcode";
import { addLink, deleteLink, logout, moveLink, toggleLink, updateProfile } from "../actions";

export default async function Dashboard({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const links = await db.link.findMany({ where: { userId: user.id }, orderBy: { position: "asc" } });
  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const publicUrl = `${siteUrl()}/${user.username}`;
  const qrSvg = await QRCode.toString(publicUrl, { type: "svg", margin: 1, width: 132 });

  return (
    <main className="dash">
      <nav className="topnav">
        <Link href="/" className="logo">🔗 LinkHub</Link>
        <div className="nav-actions">
          <Link href={`/${user.username}`} target="_blank">Ver mi página ↗</Link>
          <form action={logout}><button className="btn btn-ghost">Salir</button></form>
        </div>
      </nav>

      {searchParams.error && <p className="alert">{searchParams.error}</p>}
      {searchParams.ok && <p className="alert alert-ok">{searchParams.ok}</p>}

      <div className="dash-grid">
        <div className="dash-main">
          <section className="card share-card">
            <div className="share-info">
              <h2>Tu enlace para compartir</h2>
              <p className="muted">Ponlo en tu bio de TikTok, Instagram, YouTube o Twitch. Quien lo abra verá tu página.</p>
              <a className="share-url" href={publicUrl} target="_blank" rel="noopener noreferrer">{publicUrl}</a>
              <ShareButtons url={publicUrl} title={`${user.displayName} | LinkHub`} />
            </div>
            <div className="share-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="Código QR de tu página" />
          </section>

          <section className="card">
            <h2>Perfil</h2>
            <form action={updateProfile} className="stack">
              <label>Nombre visible<input name="displayName" defaultValue={user.displayName} maxLength={60} required /></label>
              <label>Bio<textarea name="bio" defaultValue={user.bio} maxLength={200} rows={2} /></label>
              <label>URL de avatar<input name="avatarUrl" type="url" defaultValue={user.avatarUrl} placeholder="https://..." /></label>
              <fieldset>
                <legend>Estilo visual</legend>
                <div className="theme-picker">
                  {THEMES.map((t) => (
                    <label key={t.id} className={`theme-option profile theme-${t.id}`}>
                      <input type="radio" name="theme" value={t.id} defaultChecked={user.theme === t.id} />
                      <span className="theme-card-emoji">{t.emoji}</span>
                      <strong>{t.name}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="btn">Guardar perfil</button>
            </form>
          </section>

          <section className="card">
            <h2>Añadir enlace</h2>
            <form action={addLink} className="add-link">
              <select name="platform" defaultValue="tiktok" aria-label="Plataforma">
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input name="url" placeholder="https://..." required aria-label="URL" />
              <input name="title" placeholder="Texto del botón (opcional)" maxLength={80} aria-label="Título" />
              <button className="btn">Añadir</button>
            </form>
          </section>

          <section className="card">
            <h2>Mis enlaces <span className="muted">· {totalClicks} clics en total</span></h2>
            <ul className="link-admin">
              {links.map((l, i) => (
                <li key={l.id} className={l.active ? "" : "inactive"}>
                  <span className="la-icon" style={{ color: `#${getPlatform(l.platform).color}` }}><PlatformIcon platform={l.platform} /></span>
                  <div className="la-text">
                    <strong>{l.title}</strong>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a>
                  </div>
                  <span className="la-clicks">{l.clicks} clics</span>
                  <div className="la-actions">
                    <form action={moveLink}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} title="Subir">↑</button></form>
                    <form action={moveLink}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === links.length - 1} title="Bajar">↓</button></form>
                    <form action={toggleLink}><input type="hidden" name="id" value={l.id} /><button title={l.active ? "Ocultar" : "Mostrar"}>{l.active ? "👁" : "🚫"}</button></form>
                    <form action={deleteLink}><input type="hidden" name="id" value={l.id} /><button title="Eliminar">🗑</button></form>
                  </div>
                </li>
              ))}
              {links.length === 0 && <li className="muted">Añade tu primer enlace arriba.</li>}
            </ul>
          </section>
        </div>

        <aside className="dash-preview">
          <div className="phone">
            <ProfileView user={user} links={links.filter((l) => l.active)} preview />
          </div>
          <p className="muted center">{publicUrl.replace(/^https?:\/\//, "")}</p>
        </aside>
      </div>
    </main>
  );
}
