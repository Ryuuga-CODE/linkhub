import Link from "next/link";

export const metadata = { title: "Enlace bloqueado | LinkHub", robots: { index: false } };

export default function Blocked() {
  return (
    <main className="auth">
      <div className="card report-card">
        <h1>⚠️ Enlace bloqueado</h1>
        <p>Hemos bloqueado este enlace porque puede ser peligroso (estafa, robo de datos o registro de tu IP).</p>
        <Link className="btn" href="/">Ir al inicio</Link>
      </div>
    </main>
  );
}
