import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlatform } from "@/lib/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import { DailyChart, type Day } from "@/components/DailyChart";

const RANGES = [7, 30, 90];
const DEVICE: Record<string, string> = { mobile: "📱 Móvil", desktop: "💻 Ordenador", tablet: "📲 Tablet" };
const regionName = new Intl.DisplayNames(["es"], { type: "region" });
const country = (c: string) => {
  if (!c) return "Desconocido";
  try { return regionName.of(c) ?? c; } catch { return c; }
};

export default async function Stats({ searchParams }: { searchParams: { d?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const range = RANGES.includes(Number(searchParams.d)) ? Number(searchParams.d) : 30;
  const since = new Date(Date.now() - (range - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const where = { userId: user.id, createdAt: { gte: since } };

  const [daily, byLink, byCountry, byDevice, bySource, links] = await Promise.all([
    db.$queryRaw<{ day: Date; type: string; n: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, "type", count(*) AS n
      FROM "Event" WHERE "userId" = ${user.id} AND "createdAt" >= ${since}
      GROUP BY 1, 2`,
    db.event.groupBy({ by: ["linkId"], where: { ...where, type: "click" }, _count: true }),
    db.event.groupBy({ by: ["country"], where: { ...where, type: "view" }, _count: true }),
    db.event.groupBy({ by: ["device"], where: { ...where, type: "view" }, _count: true }),
    db.event.groupBy({ by: ["source"], where: { ...where, type: "view" }, _count: true }),
    db.link.findMany({ where: { userId: user.id }, select: { id: true, title: true, platform: true } }),
  ]);

  // Serie diaria completa (también los días sin datos)
  const days: Day[] = Array.from({ length: range }, (_, i) => ({
    date: new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10), views: 0, clicks: 0,
  }));
  for (const r of daily) {
    const d = days.find((x) => x.date === r.day.toISOString().slice(0, 10));
    if (d) d[r.type === "view" ? "views" : "clicks"] = Number(r.n);
  }
  const views = days.reduce((s, d) => s + d.views, 0);
  const clicks = days.reduce((s, d) => s + d.clicks, 0);
  const ctr = views ? Math.round((clicks / views) * 100) : 0;

  const linkMap = new Map(links.map((l) => [l.id, l]));
  const top = <T extends { _count: number }>(rows: T[]) => [...rows].sort((a, b) => b._count - a._count);

  return (
    <main className="dash">
      <nav className="topnav">
        <Link href="/" className="logo">🔗 LinkHub</Link>
        <div className="nav-actions"><Link href="/dashboard">← Volver al panel</Link></div>
      </nav>
      <div className="stats">
        <div className="stats-head">
          <h1>Estadísticas</h1>
          <div className="range-tabs" role="tablist">
            {RANGES.map((r) => (
              <Link key={r} href={`/dashboard/stats?d=${r}`} className={r === range ? "active" : ""} aria-current={r === range ? "page" : undefined}>
                {r} días
              </Link>
            ))}
          </div>
        </div>

        <div className="tiles">
          <div className="tile"><span>Visitas a tu página</span><strong>{views}</strong></div>
          <div className="tile"><span>Clics en enlaces</span><strong>{clicks}</strong></div>
          <div className="tile"><span>Porcentaje de clics</span><strong>{ctr}%</strong><small>clics por cada 100 visitas</small></div>
        </div>

        <section className="card">
          <h2>Por día</h2>
          {views + clicks === 0 ? <p className="muted">Aún no hay datos en este periodo. Comparte tu enlace para empezar.</p> : <DailyChart days={days} />}
        </section>

        <div className="stats-grid">
          <Ranking title="Enlaces más pulsados" rows={top(byLink).map((r) => {
            const l = r.linkId ? linkMap.get(r.linkId) : undefined;
            return { label: l?.title ?? "Enlace borrado", n: r._count, icon: l ? <PlatformIcon platform={l.platform} size={16} /> : null, color: l ? `#${getPlatform(l.platform).color}` : undefined };
          })} />
          <Ranking title="De dónde llegan" rows={top(bySource).map((r) => ({ label: r.source || "Directo", n: r._count }))} />
          <Ranking title="Países" rows={top(byCountry).map((r) => ({ label: country(r.country), n: r._count }))} />
          <Ranking title="Dispositivos" rows={top(byDevice).map((r) => ({ label: DEVICE[r.device] ?? r.device, n: r._count }))} />
        </div>
        <p className="muted">No guardamos direcciones IP ni datos personales de quien visita tu página. Tus propias visitas no cuentan.</p>
      </div>
    </main>
  );
}

function Ranking({ title, rows }: { title: string; rows: { label: string; n: number; icon?: React.ReactNode; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="card">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="muted">Sin datos todavía.</p> : (
        <ul className="ranking">
          {rows.slice(0, 8).map((r) => (
            <li key={r.label}>
              <span className="rk-label">{r.icon && <span style={{ color: r.color }}>{r.icon}</span>}{r.label}</span>
              <span className="rk-bar"><i style={{ width: `${(r.n / max) * 100}%` }} /></span>
              <span className="rk-n">{r.n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
