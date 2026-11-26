import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";

/** IP del visitante, cifrada (nunca se guarda la IP real). */
export function clientKey() {
  const h = headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(`${process.env.AUTH_SECRET}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Cuenta un intento para `key`. Devuelve los segundos que hay que esperar si se
 * superó `max` en la ventana, o 0 si se permite. Atómico en Postgres.
 */
export async function hit(key: string, max: number, windowSec: number): Promise<number> {
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < now() THEN now() + make_interval(secs => ${windowSec}) ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  // Limpieza ocasional de entradas caducadas
  if (Math.random() < 0.02) await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86_400_000) } } });
  const { count, resetAt } = rows[0];
  return count > max ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)) : 0;
}

export async function clear(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}

export function waitMessage(sec: number) {
  const min = Math.ceil(sec / 60);
  return `Demasiados intentos. Espera ${min} ${min === 1 ? "minuto" : "minutos"} e inténtalo de nuevo.`;
}
