"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, removeImage } from "@/app/actions";

type Props = { kind: "avatar" | "banner"; current: string };

const LIMITS = { avatar: { w: 512, h: 512, crop: true }, banner: { w: 1600, h: 900, crop: false } };

/** Reduce y comprime la imagen en el navegador antes de subirla (WebP). */
async function prepare(file: File, kind: Props["kind"]): Promise<Blob> {
  // Los GIF se suben tal cual para conservar la animación
  if (file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file);
  const { w, h, crop } = LIMITS[kind];
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  if (crop) {
    // Recorte cuadrado centrado para la foto de perfil
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side;
  }
  const scale = Math.min(1, w / sw, crop ? h / sh : Infinity);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext("2d")!.drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  return blob ?? file;
}

export function ImageUploader({ kind, current }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [preview, setPreview] = useState<string>(current);
  const [error, setError] = useState("");
  const [busy, startBusy] = useTransition();
  const isAvatar = kind === "avatar";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Elige un archivo de imagen.");
    setPreview(URL.createObjectURL(file));
    startBusy(async () => {
      try {
        const blob = await prepare(file, kind);
        if (blob.size > 4 * 1024 * 1024) { setError("La imagen pesa demasiado (máximo 4 MB)."); setPreview(current); return; }
        const fd = new FormData();
        fd.set("kind", kind);
        fd.set("file", new File([blob], `${kind}.${blob.type === "image/gif" ? "gif" : "webp"}`, { type: blob.type }));
        const res = await uploadImage(fd);
        if (res.error) { setError(res.error); setPreview(current); return; }
        router.refresh();
      } catch {
        setError("No se pudo subir la imagen. Inténtalo de nuevo.");
        setPreview(current);
      }
    });
  }

  return (
    <div className={`uploader uploader-${kind}`}>
      <button
        type="button"
        className="uploader-drop"
        onClick={() => input.current?.click()}
        disabled={busy}
        style={preview ? { backgroundImage: `url("${preview}")` } : undefined}
        aria-label={isAvatar ? "Cambiar foto de perfil" : "Cambiar banner"}
      >
        {!preview && <span className="uploader-empty">{isAvatar ? "📷" : "🖼️ Toca para elegir un banner"}</span>}
        {busy && <span className="uploader-busy">Subiendo…</span>}
      </button>
      <div className="uploader-side">
        <strong>{isAvatar ? "Foto de perfil" : "Banner de fondo"}</strong>
        <span className="muted">
          {isAvatar ? "Se recorta en círculo." : "Se ve arriba de tu página y se desvanece hacia abajo."} JPG, PNG, WebP o GIF.
        </span>
        <div className="uploader-actions">
          <button type="button" className="btn btn-ghost" onClick={() => input.current?.click()} disabled={busy}>
            {current ? "Cambiar" : "Subir imagen"}
          </button>
          {current && (
            <form action={removeImage}>
              <input type="hidden" name="kind" value={kind} />
              <button className="btn btn-ghost btn-danger" disabled={busy}>Quitar</button>
            </form>
          )}
        </div>
        {error && <span className="uploader-error">{error}</span>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}
