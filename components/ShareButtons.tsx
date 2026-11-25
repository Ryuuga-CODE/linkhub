"use client";

import { useState } from "react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelado */ }
    } else {
      copy();
    }
  }

  const text = encodeURIComponent(`${title} ${url}`);
  return (
    <div className="share-actions">
      <button type="button" className="btn" onClick={copy}>{copied ? "¡Copiado! ✓" : "Copiar enlace"}</button>
      <button type="button" className="btn btn-ghost" onClick={share}>Compartir…</button>
      <a className="btn btn-ghost" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className="btn btn-ghost" href={`https://x.com/intent/tweet?text=${text}`} target="_blank" rel="noopener noreferrer">X</a>
    </div>
  );
}
