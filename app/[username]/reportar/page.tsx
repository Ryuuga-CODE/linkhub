import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { REPORT_REASONS } from "@/lib/moderation";
import { reportProfile } from "@/app/actions";

export const metadata = { title: "Reportar perfil | LinkHub", robots: { index: false } };

export default async function ReportPage({ params, searchParams }: { params: { username: string }; searchParams: { ok?: string; error?: string } }) {
  const user = await db.user.findUnique({ where: { username: params.username.toLowerCase() }, select: { username: true, displayName: true } });
  if (!user) notFound();
  return (
    <main className="auth">
      <div className="card report-card">
        {searchParams.ok ? (
          <>
            <h1>Gracias por avisarnos</h1>
            <p>Revisaremos el perfil de <strong>@{user.username}</strong>. Si incumple las normas, lo retiraremos.</p>
            <Link className="btn" href="/">Ir al inicio</Link>
          </>
        ) : (
          <form action={reportProfile} className="stack">
            <h1>Reportar a @{user.username}</h1>
            <p className="muted">Cuéntanos qué pasa con este perfil. El reporte es anónimo.</p>
            {searchParams.error && <p className="alert">{searchParams.error}</p>}
            <input type="hidden" name="username" value={user.username} />
            <fieldset className="stack">
              <legend>Motivo</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.id} className="check"><input type="radio" name="reason" value={r.id} required /> {r.label}</label>
              ))}
            </fieldset>
            <label>Detalles (opcional)<textarea name="details" rows={3} maxLength={1000} placeholder="Qué enlace es, a quién suplanta…" /></label>
            <button className="btn">Enviar reporte</button>
            <Link href={`/${user.username}`} className="muted">← Volver al perfil</Link>
          </form>
        )}
      </div>
    </main>
  );
}
