import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { THEMES } from "@/lib/themes";
import { PLATFORMS } from "@/lib/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import { AdSlot } from "@/components/AdSlot";
import { adSlotFor } from "@/lib/ads";

export default async function Home({ searchParams }: { searchParams: { ok?: string } }) {
  const user = await getCurrentUser();
  return (
    <main className="site">
      <nav className="topnav">
        <Link href="/" className="logo">🔗 LinkHub</Link>
        <div className="nav-actions">
          {user ? (
            <Link className="btn" href="/dashboard">Mi panel</Link>
          ) : (
            <>
              <Link href="/login">Entrar</Link>
              <Link className="btn" href="/register">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>

      {searchParams.ok && <p className="alert alert-ok center-box">{searchParams.ok}</p>}
      <section className="hero">
        <h1>Todos tus enlaces.<br />Un solo link.</h1>
        <p>Reúne tu TikTok, YouTube, Twitch, tu tienda de Amazon y todo lo demás en una página con el estilo de tu marca.</p>
        <Link className="btn btn-lg" href={user ? "/dashboard" : "/register"}>Empieza gratis</Link>
      </section>

      <section className="section">
        <h2>Estilos para cada perfil</h2>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <div key={t.id} className={`theme-card profile theme-${t.id}`}>
              <div className="theme-card-emoji">{t.emoji}</div>
              <strong>{t.name}</strong>
              <span>{t.description}</span>
              <div className="link-btn link-btn-demo"><span className="link-title">Mi enlace</span></div>
            </div>
          ))}
        </div>
      </section>

      {(() => {
        const ad = adSlotFor("home");
        return ad ? <div className="section"><AdSlot {...ad} /></div> : null;
      })()}

      <section className="section">
        <h2>{PLATFORMS.length}+ plataformas soportadas</h2>
        <div className="platform-cloud">
          {PLATFORMS.map((p) => (
            <span key={p.id} className="chip" style={{ color: `#${p.color}` }}>
              <PlatformIcon platform={p.id} size={16} /> <span>{p.name}</span>
            </span>
          ))}
        </div>
      </section>
      <footer className="site-footer"><Link href="/privacidad">Privacidad</Link></footer>
    </main>
  );
}
