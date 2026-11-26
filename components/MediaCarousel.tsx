"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/streams";
import { MediaPlayer } from "./MediaPlayer";

/** Carrusel horizontal (deslizar en móvil, flechas en escritorio) de vídeos o clips. */
export type MoreLink = {
  href: string;
  label: string; // "Ver más clips"
  sub: string; // "en Kick"
  color: string; // color de la marca
  icon: React.ReactNode; // logo (renderizado en el servidor)
  thumbs: string[]; // miniaturas para el mosaico de fondo
};

export function MediaCarousel({ items, more }: { items: MediaItem[]; more?: MoreLink }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: items.length <= 1 });

  const update = () => {
    const el = track.current;
    if (el) setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector("li");
    if (el && card) el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 12), behavior: "smooth" });
  };

  return (
    <div className="carousel">
      <button type="button" className="car-arrow car-prev" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Anteriores">‹</button>
      <ul ref={track} className="car-track" onScroll={update}>
        {items.map((it) => (
          <li key={it.id} className="car-card">
            <MediaPlayer item={it} />
            <a className="car-title" href={it.href} target="_blank" rel="noopener noreferrer" title={it.title}>{it.title}</a>
            {it.meta && <p className="car-meta">{it.meta}</p>}
          </li>
        ))}
        {more && (
          <li className="car-card car-more">
            <a href={more.href} target="_blank" rel="noopener noreferrer" style={{ ["--more-brand" as string]: more.color }}>
              <span className="more-mosaic" aria-hidden>
                {more.thumbs.slice(0, 4).map((t, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={t} alt="" loading="lazy" />
                ))}
              </span>
              <span className="more-icon" aria-hidden>{more.icon}</span>
              <span className="more-label">{more.label} <span className="more-arrow" aria-hidden>→</span></span>
              <span className="more-sub">{more.sub}</span>
            </a>
          </li>
        )}
      </ul>
      <button type="button" className="car-arrow car-next" onClick={() => scroll(1)} disabled={edges.end} aria-label="Siguientes">›</button>
    </div>
  );
}
