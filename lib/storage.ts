import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Neon Object Storage (S3-compatible). Variables escritas por `neon deploy`.
// En Vercel los nombres AWS_* están reservados (y la plataforma inyecta los suyos),
// así que allí se usan NEON_S3_*; en local valen las AWS_* que escribe Neon.
const cfg = {
  endpoint: process.env.NEON_S3_ENDPOINT ?? process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.NEON_S3_REGION ?? process.env.AWS_REGION ?? "us-east-2",
  accessKeyId: process.env.NEON_S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEON_S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
};

export const BUCKET = "media";

let client: S3Client | null = null;
function s3() {
  if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    throw new Error("Almacenamiento no configurado: faltan las variables de Neon Object Storage");
  }
  client ??= new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: true, // Neon requiere path-style
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  return client;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string) {
  return s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** URL pública de un objeto: se sirve desde nuestra ruta /media con caché de CDN. */
export const mediaUrl = (key: string) => `/media/${key}`;

/** Devuelve la clave si la URL apunta a un archivo nuestro. */
export const keyFromUrl = (url: string) => (url.startsWith("/media/") ? url.slice("/media/".length) : null);
