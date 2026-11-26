import Link from "next/link";
import { adsConfig } from "@/lib/ads";

export const metadata = { title: "Privacidad | LinkHub" };

export default function Privacy() {
  const ads = !!adsConfig();
  return (
    <main className="site">
      <nav className="topnav"><Link href="/" className="logo">🔗 LinkHub</Link></nav>
      <article className="legal">
        <h1>Política de privacidad</h1>
        <p className="muted">Última actualización: noviembre de 2026</p>

        <h2>Qué datos guardamos</h2>
        <ul>
          <li><strong>Tu cuenta:</strong> correo, nombre de usuario y contraseña (cifrada; nunca la vemos).</li>
          <li><strong>Tu página:</strong> nombre, bio, imágenes, enlaces, estilo y, si los añades, tus datos de contacto. Todo esto es público.</li>
          <li><strong>Estadísticas:</strong> cuando alguien visita una página o pulsa un enlace guardamos el día, el país aproximado, el tipo de dispositivo y la red social de origen. <strong>No guardamos direcciones IP</strong> ni datos que identifiquen a quien visita.</li>
          <li><strong>Seguridad:</strong> para limitar intentos de acceso usamos una versión cifrada e irreversible de la IP que caduca en horas.</li>
        </ul>

        <h2>Cookies</h2>
        <ul>
          <li><strong>Sesión:</strong> una cookie necesaria para mantener tu sesión iniciada.</li>
          {ads && (
            <li>
              <strong>Publicidad:</strong> mostramos anuncios de Google AdSense. Google y sus socios pueden usar cookies para mostrar anuncios
              según tus visitas a este y otros sitios. Consulta{" "}
              <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">cómo usa Google los datos</a>{" "}
              y desactiva los anuncios personalizados en{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">la configuración de anuncios de Google</a>.
              Si visitas desde el Espacio Económico Europeo, Reino Unido o Suiza, te pediremos tu consentimiento antes.
            </li>
          )}
        </ul>

        <h2>Contenido de terceros</h2>
        <p>Los vídeos y reproductores incrustados (YouTube, Spotify, Twitch, Kick) los sirven esas plataformas con sus propias políticas.</p>

        <h2>Tus derechos</h2>
        <p>Puedes editar tus datos en tu panel y <strong>borrar tu cuenta</strong> en cualquier momento desde «Cuenta → Borrar mi cuenta»: se eliminan tu página, enlaces, imágenes y estadísticas.</p>

        <h2>Dónde se guardan</h2>
        <p>La web funciona en Vercel y los datos se guardan en Neon (Estados Unidos). Los correos se envían con Resend.</p>
      </article>
    </main>
  );
}
