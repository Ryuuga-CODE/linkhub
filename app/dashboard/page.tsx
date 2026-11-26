import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLATFORMS, getPlatform } from "@/lib/platforms";
import { THEMES } from "@/lib/themes";
import { PlatformIcon } from "@/components/PlatformIcon";
import { ProfileView } from "@/components/ProfileView";
import { ShareButtons } from "@/components/ShareButtons";
import { ImageUploader } from "@/components/ImageUploader";
import { StyleEditor } from "@/components/StyleEditor";
import { SortableList } from "@/components/SortableList";
import { siteUrl } from "@/lib/site";
import QRCode from "qrcode";
import { addLink, changeUsername, deleteAccount, updateContact, deleteLink, logout, moveLink, toggleLink, updateLink, updateProfile } from "../actions";

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
          <Link href="/dashboard/stats">📊 Estadísticas</Link>
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
            <h2>Imágenes</h2>
            <div className="stack">
              <ImageUploader key={user.bannerUrl || "banner"} kind="banner" current={user.bannerUrl} />
              <ImageUploader key={user.avatarUrl || "avatar"} kind="avatar" current={user.avatarUrl} />
            </div>
          </section>

          <section className="card">
            <h2>Perfil</h2>
            <form action={updateProfile} className="stack">
              <label>Nombre visible<input name="displayName" defaultValue={user.displayName} maxLength={60} required /></label>
              <label>Bio<textarea name="bio" defaultValue={user.bio} maxLength={200} rows={2} /></label>
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

          <section className="card" id="estilo">
            <h2>Personalizar estilo</h2>
            <StyleEditor
              initial={{
                colorButton: user.colorButton, colorButtonText: user.colorButtonText, colorText: user.colorText,
                colorBg: user.colorBg, colorBg2: user.colorBg2, buttonShape: user.buttonShape, buttonFill: user.buttonFill, font: user.font,
              }}
            />
          </section>

          <section className="card">
            <h2>Añadir enlace</h2>
            <form action={addLink} className="add-link" key={`add-${links.length}`}>
              <KindFields />
              <select name="platform" defaultValue="tiktok" aria-label="Plataforma">
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input name="url" placeholder="https://..." required aria-label="URL" />
              <input name="title" placeholder="Texto del botón (opcional)" maxLength={80} aria-label="Título" />
              <button className="btn">Añadir</button>
              <LinkOptions />
            </form>
          </section>

          <section className="card">
            <h2>Mis enlaces <span className="muted">· {totalClicks} clics en total · <Link href="/dashboard/stats">ver estadísticas</Link></span></h2>
            {links.length > 1 && <p className="muted">Arrastra ⋮⋮ para cambiar el orden.</p>}
            <SortableList className="link-admin" ids={links.map((l) => l.id)} key={links.map((l) => l.id).join()}>
              {links.map((l, i) => (
                <li key={l.id} data-id={l.id} className={l.active ? "" : "inactive"}>
                  <div className="la-row">
                    <span className="drag-handle" data-drag-handle title="Arrastrar para ordenar" aria-hidden>⋮⋮</span>
                    <span className="la-icon" style={{ color: `#${getPlatform(l.platform).color}` }}><PlatformIcon platform={l.platform} /></span>
                    <div className="la-text">
                      <strong>
                        {l.title}
                        {l.display === "icon" && <span className="tag">icono</span>}
                        {l.highlight && <span className="tag tag-hot">destacado</span>}
                        {l.kind === "product" && <span className="tag tag-shop">producto{l.price ? ` · ${l.price}` : ""}</span>}
                        {l.kind === "embed" && <span className="tag">incrustado</span>}
                      </strong>
                      <a href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a>
                    </div>
                    <span className="la-clicks">{l.clicks} clics</span>
                    <div className="la-actions">
                      <form action={moveLink}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} title="Subir">↑</button></form>
                      <form action={moveLink}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === links.length - 1} title="Bajar">↓</button></form>
                      <form action={toggleLink}><input type="hidden" name="id" value={l.id} /><button title={l.active ? "Ocultar" : "Mostrar"}>{l.active ? "👁" : "🚫"}</button></form>
                      <form action={deleteLink}><input type="hidden" name="id" value={l.id} /><button title="Eliminar">🗑</button></form>
                    </div>
                  </div>
                  <details className="la-edit">
                    <summary>✏️ Editar</summary>
                    <form action={updateLink} className="add-link" key={`${l.id}-${l.platform}-${l.url}-${l.title}-${l.display}-${l.highlight}`}>
                      <input type="hidden" name="id" value={l.id} />
                      <KindFields kind={l.kind} price={l.price} />
                      <select name="platform" defaultValue={l.platform} aria-label="Plataforma">
                        {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input name="url" defaultValue={l.url} required aria-label="URL" />
                      <input name="title" defaultValue={l.title} maxLength={80} aria-label="Título" />
                      <button className="btn">Guardar</button>
                      <LinkOptions display={l.display} highlight={l.highlight} />
                    </form>
                    <ImageUploader key={l.thumbnailUrl || `thumb-${l.id}`} kind="thumb" linkId={l.id} current={l.thumbnailUrl} />
                  </details>
                </li>
              ))}
            </SortableList>
            {links.length === 0 && <p className="muted">Añade tu primer enlace arriba.</p>}
          </section>

          <section className="card" id="contacto">
            <h2>Contacto</h2>
            <p className="muted">Ideal para empresas y tiendas. Lo que rellenes aparece en tu página con botones para llamar, escribir o llegar, y un botón para guardarte en la agenda.</p>
            <form action={updateContact} className="contact-form">
              <label>Teléfono<input name="contactPhone" type="tel" defaultValue={user.contactPhone} placeholder="+52 55 1234 5678" maxLength={25} /></label>
              <label>WhatsApp<input name="contactWhatsapp" type="tel" defaultValue={user.contactWhatsapp} placeholder="+52 55 1234 5678" maxLength={25} /></label>
              <label>Correo<input name="contactEmail" type="email" defaultValue={user.contactEmail} placeholder="hola@tunegocio.com" /></label>
              <label>Horario<input name="contactHours" defaultValue={user.contactHours} placeholder="Lun–Vie 9:00–18:00" maxLength={120} /></label>
              <label className="wide">Dirección<input name="contactAddress" defaultValue={user.contactAddress} placeholder="Calle, número, ciudad" maxLength={200} /></label>
              <button className="btn">Guardar contacto</button>
            </form>
          </section>

          <section className="card">
            <h2>Cuenta</h2>
            <form action={changeUsername} className="inline-form">
              <label>Nombre de usuario
                <div className="prefix-input"><span>{publicUrl.replace(/^https?:\/\//, "").replace(/[^/]+$/, "")}</span><input name="username" defaultValue={user.username} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" /></div>
              </label>
              <button className="btn btn-ghost">Cambiar</button>
            </form>
            <p className="muted">Si lo cambias, tu enlace anterior dejará de funcionar: actualízalo en tus redes.</p>

            <details className="danger-zone">
              <summary>Borrar mi cuenta</summary>
              <form action={deleteAccount} className="stack">
                <p>Se borrarán tu página, tus enlaces, tus imágenes y tus estadísticas. <strong>No se puede deshacer.</strong></p>
                <label>Escribe tu contraseña para confirmar<input name="password" type="password" required autoComplete="current-password" /></label>
                <button className="btn btn-danger-solid">Borrar mi cuenta para siempre</button>
              </form>
            </details>
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

function LinkOptions({ display = "button", highlight = false }: { display?: string; highlight?: boolean }) {
  return (
    <div className="link-options">
      <label className="check"><input type="checkbox" name="display" value="icon" defaultChecked={display === "icon"} /> Mostrar como icono (fila de redes bajo la bio)</label>
      <label className="check"><input type="checkbox" name="highlight" defaultChecked={highlight} /> ⭐ Destacar con animación</label>
    </div>
  );
}

function KindFields({ kind = "link", price = "" }: { kind?: string; price?: string }) {
  return (
    <div className="kind-fields">
      <label className="check"><input type="radio" name="kind" value="link" defaultChecked={kind !== "product"} /> 🔗 Enlace</label>
      <label className="check"><input type="radio" name="kind" value="product" defaultChecked={kind === "product"} /> 🛍️ Producto (con foto y precio)</label>
      <label className="check"><input type="radio" name="kind" value="embed" defaultChecked={kind === "embed"} /> ▶️ Incrustar (último vídeo de YouTube, Spotify, Twitch o Kick)</label>
      <input className="price-field" name="price" defaultValue={price} placeholder="Precio, ej. $299 MXN" maxLength={30} aria-label="Precio" />
    </div>
  );
}
