# 🔗 LinkHub

Plataforma estilo *link-in-bio*: cada persona se registra, elige un nombre de usuario y publica una página (`/tu-usuario`) con todos sus enlaces — TikTok, YouTube, Twitch, Kick, Amazon, Mercado Libre, Instagram, Discord, Spotify y más — con el estilo visual que mejor encaje con su perfil.

## Funcionalidades

- **Registro e inicio de sesión** con correo y contraseña (bcrypt + sesión JWT en cookie `httpOnly`).
- **Página pública** en `/<usuario>` con avatar, nombre, bio y botones de enlaces.
- **6 estilos visuales**: 🎮 Gamer · 💼 Empresa · 🛍️ Tienda · ✨ Creador · ◻️ Minimal · 🌿 Naturaleza.
- **26 plataformas** con su icono y color de marca (vía [simple-icons](https://simpleicons.org)): TikTok, YouTube, Twitch, Kick, Instagram, X, Threads, Facebook, Discord, Steam, Spotify, Amazon, Mercado Libre, Shopify, Etsy, PayPal, Patreon, Ko-fi, LinkedIn, WhatsApp, Telegram, Pinterest, Snapchat, GitHub, sitio web y correo.
- **Foto de perfil y banner** subidos desde el dispositivo; el banner se desvanece hacia abajo sobre el fondo del tema.
- **Panel** para editar perfil, añadir/ocultar/eliminar/reordenar enlaces, con vista previa en vivo tipo móvil.
- **Contador de clics** por enlace (los botones públicos pasan por `/go/<id>`).

## Cómo funciona

1. Una persona entra al sitio y se **registra** eligiendo su usuario (p. ej. `tiendaluna`).
2. En su **panel** añade enlaces (TikTok, YouTube, Amazon…), escribe su bio y elige un estilo.
3. Arriba del panel ve **su enlace personal** — `https://tu-dominio.com/tiendaluna` — con botones para copiarlo, compartirlo por WhatsApp/X y un **código QR**.
4. Pega ese enlace en la bio de sus redes. Cualquiera que lo abra ve su página, sin necesidad de cuenta.
5. Cada clic pasa por `/go/<id>`, que suma el clic y redirige a la red social.

## Stack

- [Next.js 14](https://nextjs.org) (App Router, Server Actions) + TypeScript
- [Prisma](https://www.prisma.io) con PostgreSQL
- `zod` para validación, `jose` para sesiones, `bcryptjs` para contraseñas, `qrcode` para el QR

## Desarrollo local

```bash
npm install
cp .env.example .env     # cambia AUTH_SECRET
docker compose up -d     # PostgreSQL local
npx prisma migrate deploy
npm run dev              # http://localhost:3000
```

## Base de datos en Neon

El proyecto está enlazado a Neon (`neon.ts`, rama `production`). Para traer las variables de conexión a tu `.env`:

```bash
neon login
neon deploy      # aplica neon.ts y escribe DATABASE_URL / DATABASE_URL_UNPOOLED en .env
```

`DATABASE_URL` es la conexión *pooled* (la usa la app) y `DATABASE_URL_UNPOOLED` la directa (la usan las migraciones de Prisma).

### Imágenes (Neon Object Storage)

Las fotos de perfil y los banners se suben desde el dispositivo, se comprimen en el navegador (WebP) y se guardan en el bucket `media` declarado en `neon.ts`. Se sirven desde `/media/...` con caché de un año (cada subida usa un nombre nuevo).

`neon deploy` escribe `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` en `.env`, que es lo que usa la app en local. **En Vercel** esos nombres están reservados, así que cópialos como `NEON_S3_ENDPOINT`, `NEON_S3_REGION`, `NEON_S3_ACCESS_KEY_ID` y `NEON_S3_SECRET_ACCESS_KEY`.

## Publicar en internet (Vercel + Neon, gratis)

1. Entra en [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New… → Project** → importa este repositorio.
2. Antes de pulsar *Deploy*, en **Environment Variables** añade `AUTH_SECRET` con un valor largo y aleatorio.
3. Pulsa **Deploy** (el primer intento fallará por falta de base de datos; es normal).
4. En el proyecto: **Storage → Create Database → Neon (Postgres)** → conéctala al proyecto. Esto crea `DATABASE_URL` y `DATABASE_URL_UNPOOLED` automáticamente.
5. **Deployments → ⋯ → Redeploy**. El build aplica las migraciones y el sitio queda en `https://<proyecto>.vercel.app`.
6. (Opcional) **Settings → Domains** para usar tu propio dominio. Los enlaces de los usuarios usan el dominio con el que se abre el sitio; para fijarlo, define `NEXT_PUBLIC_SITE_URL`.

Cada usuario tendrá su enlace en `https://<tu-dominio>/<usuario>`.

## Estructura

```
app/
  page.tsx               Landing
  register/, login/      Autenticación
  dashboard/             Panel del usuario (perfil, enlaces, tema)
  [username]/            Página pública del perfil
  go/[id]/route.ts       Redirección con conteo de clics
  actions.ts             Server Actions (registro, login, CRUD de enlaces)
  globals.css            Estilos de la app y de los temas (.theme-*)
components/              ProfileView, PlatformIcon, ShareButtons
lib/
  platforms.ts           Catálogo de plataformas (añade aquí nuevas redes)
  themes.ts              Catálogo de temas (y su CSS en globals.css)
  auth.ts, db.ts, validation.ts
prisma/schema.prisma     Modelos User y Link (+ migrations/)
```

### Añadir una plataforma
Agrega una línea en `lib/platforms.ts` con el id, nombre, clave de simple-icons y un placeholder.

### Añadir un tema
Agrega una entrada en `lib/themes.ts` y un bloque `.theme-<id>` en `app/globals.css` sobrescribiendo las variables `--p-*`.
