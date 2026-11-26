import Link from "next/link";
import { requestReset, resetPassword } from "../actions";
import { emailEnabled, peekToken } from "@/lib/email";

export const metadata = { title: "Recuperar contraseña | LinkHub", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: { token?: string; sent?: string; error?: string } }) {
  const { token, sent, error } = searchParams;

  if (!emailEnabled()) {
    return (
      <main className="auth"><div className="card"><h1>Recuperar contraseña</h1><p>La recuperación por correo aún no está activada.</p><Link href="/login">← Volver</Link></div></main>
    );
  }

  if (token) {
    const valid = await peekToken(token, "reset");
    return (
      <main className="auth">
        {valid ? (
          <form action={resetPassword} className="card">
            <h1>Elige una contraseña nueva</h1>
            {error && <p className="alert">{error}</p>}
            <input type="hidden" name="token" value={token} />
            <label>Contraseña nueva<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
            <label>Repítela<input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></label>
            <button className="btn">Guardar y entrar</button>
          </form>
        ) : (
          <div className="card">
            <h1>Enlace caducado</h1>
            <p>Este enlace no es válido, ya se usó o ha caducado (dura 1 hora).</p>
            <Link className="btn" href="/reset">Pedir uno nuevo</Link>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="auth">
      {sent ? (
        <div className="card">
          <h1>Revisa tu correo</h1>
          <p>Si hay una cuenta con ese correo, te hemos enviado un enlace para elegir una contraseña nueva. Mira también en spam.</p>
          <Link href="/login">← Volver a entrar</Link>
        </div>
      ) : (
        <form action={requestReset} className="card">
          <h1>¿Olvidaste tu contraseña?</h1>
          <p className="muted">Escribe tu correo y te enviaremos un enlace para elegir una nueva.</p>
          {error && <p className="alert">{error}</p>}
          <label>Correo<input name="email" type="email" required autoComplete="email" /></label>
          <button className="btn">Enviar enlace</button>
          <Link href="/login" className="muted">← Volver</Link>
        </form>
      )}
    </main>
  );
}
