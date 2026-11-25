# 🔗 LinkHub

Plataforma estilo *link-in-bio*: cada persona se registra, elige un nombre de usuario y publica una página (`/tu-usuario`) con todos sus enlaces — TikTok, YouTube, Twitch, Kick, Amazon, Mercado Libre, Instagram, Discord, Spotify y más — con el estilo visual que mejor encaje con su perfil.

## Funcionalidades

- **Registro e inicio de sesión** con correo y contraseña (bcrypt + sesión JWT en cookie `httpOnly`).
- **Página pública** en `/<usuario>` con avatar, nombre, bio y botones de enlaces.
- **6 estilos visuales**: 🎮 Gamer · 💼 Empresa · 🛍️ Tienda · ✨ Creador · ◻️ Minimal · 🌿 Naturaleza.
- **26 plataformas** con su icono y color de marca (vía [simple-icons](https://simpleicons.org)): TikTok, YouTube, Twitch, Kick, Instagram, X, Threads, Facebook, Discord, Steam, Spotify, Amazon, Mercado Libre, Shopify, Etsy, PayPal, Patreon, Ko-fi, LinkedIn, WhatsApp, Telegram, Pinterest, Snapchat, GitHub, sitio web y correo.
- **Panel** para editar perfil, añadir/ocultar/eliminar/reordenar enlaces, con vista previa en vivo tipo móvil.
- **Contador de clics** por enlace (los botones públicos pasan por `/go/<id>`).

## Stack

- [Next.js 14](https://nextjs.org) (App Router, Server Actions) + TypeScript
- [Prisma](https://www.prisma.io) con SQLite (fácil de cambiar a PostgreSQL)
- `zod` para validación, `jose` para sesiones, `bcryptjs` para contraseñas

## Puesta en marcha

```bash
npm install
cp .env.example .env   # y cambia AUTH_SECRET
npm run db:push        # crea la base de datos SQLite
npm run dev            # http://localhost:3000
```

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
components/              ProfileView, PlatformIcon
lib/
  platforms.ts           Catálogo de plataformas (añade aquí nuevas redes)
  themes.ts              Catálogo de temas (y su CSS en globals.css)
  auth.ts, db.ts, validation.ts
prisma/schema.prisma     Modelos User y Link
```

### Añadir una plataforma
Agrega una línea en `lib/platforms.ts` con el id, nombre, clave de simple-icons y un placeholder.

### Añadir un tema
Agrega una entrada en `lib/themes.ts` y un bloque `.theme-<id>` en `app/globals.css` sobrescribiendo las variables `--p-*`.

## Producción

Para desplegar (Vercel, Railway, etc.) cambia `provider = "postgresql"` en `prisma/schema.prisma`, configura `DATABASE_URL` y un `AUTH_SECRET` largo y aleatorio.
