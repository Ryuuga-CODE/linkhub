import Link from "next/link";
import { login } from "../actions";
import { emailEnabled } from "@/lib/email";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  return (
    <main className="auth">
      <form action={login} className="card">
        <h1>Entrar</h1>
        {searchParams.error && <p className="alert">{searchParams.error}</p>}
        {searchParams.ok && <p className="alert alert-ok">{searchParams.ok}</p>}
        <label>Correo<input name="email" type="email" required autoComplete="email" /></label>
        <label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="btn">Entrar</button>
        {emailEnabled() && <Link href="/reset" className="muted center">¿Olvidaste tu contraseña?</Link>}
        <p className="muted">¿No tienes cuenta? <Link href="/register">Regístrate</Link></p>
      </form>
    </main>
  );
}
