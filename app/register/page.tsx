import Link from "next/link";
import { register } from "../actions";
import { siteUrl } from "@/lib/site";

export default function RegisterPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="auth">
      <form action={register} className="card">
        <h1>Crea tu LinkHub</h1>
        {searchParams.error && <p className="alert">{searchParams.error}</p>}
        <label>Usuario
          <div className="prefix-input"><span>{siteUrl().replace(/^https?:\/\//, "")}/</span><input name="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" /></div>
        </label>
        <label>Correo<input name="email" type="email" required autoComplete="email" /></label>
        <label>Contraseña<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
        <button className="btn">Crear cuenta</button>
        <p className="muted">¿Ya tienes cuenta? <Link href="/login">Entra</Link></p>
      </form>
    </main>
  );
}
