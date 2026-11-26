import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { themeMode } from "@/lib/theme";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { REPORT_REASONS, isAdmin } from "@/lib/moderation";
import { addBlockedDomain, removeBlockedDomain, resolveReport, setUserFlag } from "@/app/actions";

export const metadata = { title: "Administración | LinkHub", robots: { index: false } };
const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;
const fmt = (d: Date) => d.toLocaleString("es", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";

export default async function Admin({ searchParams }: { searchParams: { q?: string; ok?: string; error?: string } }) {
  const me = await getCurrentUser();
  if (!isAdmin(me)) notFound();
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const [reports, blocked, found, counts] = await Promise.all([
    db.report.findMany({ where: { status: "open" }, orderBy: { createdAt: "desc" }, take: 100, include: { user: true } }),
    db.blockedDomain.findMany({ orderBy: { createdAt: "desc" } }),
    q ? db.user.findMany({ where: { OR: [{ username: { contains: q } }, { displayName: { contains: q, mode: "insensitive" } }] }, take: 20, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    Promise.all([db.user.count(), db.link.count(), db.user.count({ where: { suspended: true } })]),
  ]);

  const UserRow = ({ u }: { u: { id: string; username: string; displayName: string; verified: boolean; suspended: boolean } }) => (
    <div className="admin-user">
      <Link href={`/${u.username}`} target="_blank"><strong>{u.displayName}</strong> <span className="muted">@{u.username}</span></Link>
      {u.verified && <span className="tag">verificado</span>}
      {u.suspended && <span className="tag tag-hot">suspendido</span>}
      <div className="admin-actions">
        <form action={setUserFlag}>
          <input type="hidden" name="id" value={u.id} /><input type="hidden" name="flag" value="verified" /><input type="hidden" name="q" value={q} />
          <input type="hidden" name="value" value={String(!u.verified)} />
          <button className="btn btn-ghost">{u.verified ? "Quitar verificado" : "✓ Verificar"}</button>
        </form>
        <form action={setUserFlag}>
          <input type="hidden" name="id" value={u.id} /><input type="hidden" name="flag" value="suspended" /><input type="hidden" name="q" value={q} />
          <input type="hidden" name="value" value={String(!u.suspended)} />
          <button className={`btn btn-ghost${u.suspended ? "" : " btn-danger"}`}>{u.suspended ? "Reactivar" : "Suspender"}</button>
        </form>
      </div>
    </div>
  );

  return (
    <main className="dash">
      <nav className="topnav">
        <Link href="/" className="logo">🔗 LinkHub · Admin</Link>
        <div className="nav-actions"><ThemeToggle initial={themeMode()} /><Link href="/dashboard">Mi panel</Link></div>
      </nav>
      <div className="stats">
        {searchParams.error && <p className="alert">{searchParams.error}</p>}
        {searchParams.ok && <p className="alert alert-ok">{searchParams.ok}</p>}
        <div className="tiles">
          <div className="tile"><span>Usuarios</span><strong>{counts[0]}</strong></div>
          <div className="tile"><span>Enlaces</span><strong>{counts[1]}</strong></div>
          <div className="tile"><span>Reportes abiertos</span><strong>{reports.length}</strong></div>
          <div className="tile"><span>Suspendidos</span><strong>{counts[2]}</strong></div>
        </div>

        <section className="card">
          <h2>Reportes pendientes</h2>
          {reports.length === 0 ? <p className="muted">No hay reportes pendientes. 🎉</p> : (
            <ul className="admin-list">
              {reports.map((r) => (
                <li key={r.id}>
                  <p className="admin-reason"><strong>{reasonLabel(r.reason)}</strong> <span className="muted">· {fmt(r.createdAt)}</span></p>
                  {r.details && <p className="admin-details">“{r.details}”</p>}
                  <UserRow u={r.user} />
                  <form action={resolveReport}><input type="hidden" name="id" value={r.id} /><button className="btn">Marcar como revisado</button></form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Buscar usuario</h2>
          <form className="inline-form" action="/admin">
            <label>Usuario o nombre<input name="q" defaultValue={q} placeholder="tiendaluna" /></label>
            <button className="btn">Buscar</button>
          </form>
          {q && (found.length === 0 ? <p className="muted">Sin resultados.</p> : <div className="admin-list">{found.map((u) => <UserRow key={u.id} u={u} />)}</div>)}
        </section>

        <section className="card">
          <h2>Dominios bloqueados</h2>
          <p className="muted">Además de una lista incorporada de sitios que registran la IP. Se comprueba al guardar el enlace y al hacer clic.</p>
          <form className="inline-form" action={addBlockedDomain}>
            <label>Dominio<input name="host" placeholder="sitio-estafa.com" required /></label>
            <label>Nota<input name="note" placeholder="Phishing de bancos" maxLength={200} /></label>
            <button className="btn">Bloquear</button>
          </form>
          <ul className="admin-list">
            {blocked.map((d) => (
              <li key={d.host} className="admin-user">
                <strong>{d.host}</strong> {d.note && <span className="muted">{d.note}</span>}
                <form action={removeBlockedDomain} className="admin-actions"><input type="hidden" name="host" value={d.host} /><button className="btn btn-ghost">Desbloquear</button></form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
