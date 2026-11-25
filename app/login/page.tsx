import Link from "next/link";
import { login } from "../actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="auth">
      <form action={login} className="card">
        <h1>Entrar</h1>
        {searchParams.error && <p className="alert">{searchParams.error}</p>}
        <label>Correo<input name="email" type="email" required autoComplete="email" /></label>
        <label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label>
        <button className="btn">Entrar</button>
        <p className="muted">¿No tienes cuenta? <Link href="/register">Regístrate</Link></p>
      </form>
    </main>
  );
}
