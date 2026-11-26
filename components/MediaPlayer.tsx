"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/streams";

/** Reproduce un .m3u8 (HLS) con hls.js, cargado solo al pulsar; nativo si el navegador no tiene MediaSource. */
function HlsVideo({ src, poster, title }: { src: string; poster: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let hls: { destroy(): void } | null = null;
    let cancelled = false;
    const native = () => {
      el.src = src;
      el.play().catch(() => {});
    };
    // Primero hls.js (más fiable); el HLS nativo solo si no hay MediaSource (iPhone antiguos)
    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) return native();
        const h = new Hls();
        h.loadSource(src);
        h.attachMedia(el);
        h.on(Hls.Events.MANIFEST_PARSED, () => el.play().catch(() => {}));
        hls = h;
      })
      .catch(native);
    return () => { cancelled = true; hls?.destroy(); };
  }, [src]);
  return <video ref={video} poster={poster} controls playsInline title={title} />;
}

/** Miniatura con botón de reproducir; al pulsar carga el reproductor. */
export function MediaPlayer({ item, large }: { item: MediaItem; large?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`media-frame${large ? " media-large" : ""}`}>
      {playing ? (
        item.player === "hls" ? (
          <HlsVideo src={item.src} poster={item.thumb} title={item.title} />
        ) : (
          <iframe src={item.src} title={item.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        )
      ) : (
        <button type="button" className="media-thumb" onClick={() => setPlaying(true)} aria-label={`Reproducir: ${item.title}`}>
          {item.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumb} alt="" loading="lazy" />
          )}
          <span className="media-play" aria-hidden>▶</span>
        </button>
      )}
    </div>
  );
}
