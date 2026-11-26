"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * Un bloque de anuncio de AdSense, discreto:
 * - se carga solo cuando el visitante se acerca (no ralentiza la página);
 * - lleva la etiqueta "Publicidad" y un espacio reservado (sin saltos de diseño);
 * - si Google no tiene anuncio, el bloque desaparece (ver CSS: data-ad-status="unfilled").
 */
export function AdSlot({ client, slot, test, className = "" }: { client: string; slot: string; test?: boolean; className?: string }) {
  const ins = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const el = ins.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || pushed.current || el.dataset.adsbygoogleStatus) return;
        pushed.current = true;
        io.disconnect();
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* bloqueador de anuncios, etc. */ }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <aside className={`ad-slot ${className}`} aria-label="Publicidad">
      <Script
        id="adsbygoogle-js"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
      <span className="ad-label">Publicidad</span>
      <ins
        ref={ins}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(test ? { "data-adtest": "on" } : {})}
      />
    </aside>
  );
}
