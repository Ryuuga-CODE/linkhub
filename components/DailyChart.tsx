"use client";

import { useState } from "react";

export type Day = { date: string; views: number; clicks: number };

// Paleta validada (slots 1 y 2): visitas azul, clics naranja
const SERIES = [
  { key: "views", label: "Visitas", color: "var(--series-1)" },
  { key: "clicks", label: "Clics", color: "var(--series-2)" },
] as const;

const W = 720, H = 240, PAD = { l: 36, r: 8, t: 12, b: 26 };

/** Máximo del eje con 4 tramos enteros "redondos" (1, 2, 5 × 10ⁿ). */
function niceMax(v: number) {
  const raw = Math.max(1, v / 4);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  return step * 4;
}

const fmtDay = (d: string, long = false) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("es", { day: "numeric", month: "short", ...(long ? { weekday: "short" } : {}), timeZone: "UTC" });

/** Barras agrupadas por día con tooltip al pasar el ratón (o tocar). */
export function DailyChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...days.map((d) => Math.max(d.views, d.clicks))));
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  const col = plotW / days.length;
  const gap = 2; // separación de 2px entre barras
  const barW = Math.max(1.5, Math.min(14, (col - 6) / 2 - gap / 2));
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const labelEvery = Math.ceil(days.length / 7);
  const h = hover !== null ? days[hover] : null;

  return (
    <div className="chart">
      <div className="chart-legend">
        {SERIES.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <div className="chart-box">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visitas y clics por día" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="tick">{t.toLocaleString("es")}</text>
            </g>
          ))}
          {days.map((d, i) => {
            const cx = PAD.l + col * i + col / 2;
            return (
              <g key={d.date}>
                {SERIES.map((s, j) => {
                  const v = d[s.key];
                  if (!v) return null;
                  const x = cx + (j === 0 ? -barW - gap / 2 : gap / 2);
                  const top = y(v), hgt = PAD.t + plotH - top;
                  const r = Math.min(4, barW / 2, hgt); // extremo redondeado de 4px, base recta
                  return (
                    <path
                      key={s.key}
                      style={{ fill: s.color }}
                      opacity={hover === null || hover === i ? 1 : 0.35}
                      d={`M${x},${PAD.t + plotH} V${top + r} q0,-${r} ${r},-${r} h${barW - 2 * r} q${r},0 ${r},${r} V${PAD.t + plotH} Z`}
                    />
                  );
                })}
                {i % labelEvery === 0 && (
                  <text x={cx} y={H - 8} textAnchor="middle" className="tick">{fmtDay(d.date)}</text>
                )}
                {/* Zona de hover más grande que la barra */}
                <rect x={PAD.l + col * i} y={PAD.t} width={col} height={plotH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
              </g>
            );
          })}
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + plotH} y2={PAD.t + plotH} className="axis" />
        </svg>
        {h && hover !== null && (
          <div
            className="chart-tip"
            style={(() => {
              // Al lado de la columna (no encima de las barras), hacia dentro del gráfico
              const x = ((PAD.l + col * hover + col / 2) / W) * 100;
              return x > 60
                ? { right: `${100 - x + (col / W) * 60}%` }
                : { left: `${x + (col / W) * 60}%` };
            })()}
          >
            <strong>{fmtDay(h.date, true)}</strong>
            {SERIES.map((s) => (
              <span key={s.key}><i style={{ background: s.color }} />{s.label}: <b>{h[s.key]}</b></span>
            ))}
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Ver como tabla</summary>
        <table>
          <thead><tr><th>Día</th><th>Visitas</th><th>Clics</th></tr></thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.date}><td>{fmtDay(d.date, true)}</td><td>{d.views}</td><td>{d.clicks}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
