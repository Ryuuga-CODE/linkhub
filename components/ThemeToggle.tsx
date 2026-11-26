"use client";

import { useState } from "react";

type Mode = "auto" | "light" | "dark";
const OPTIONS: { id: Mode; icon: string; label: string }[] = [
  { id: "light", icon: "☀️", label: "Claro" },
  { id: "dark", icon: "🌙", label: "Oscuro" },
  { id: "auto", icon: "💻", label: "Automático (como tu dispositivo)" },
];

/** Selector de tema del panel. Se guarda en una cookie que el servidor lee (sin parpadeo). */
export function ThemeToggle({ initial }: { initial: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const choose = (m: Mode) => {
    setMode(m);
    document.cookie = `lh_theme=${m}; path=/; max-age=31536000; samesite=lax`;
    if (m === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.dataset.theme = m;
  };
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Tema">
      {OPTIONS.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={mode === o.id} title={o.label} aria-label={o.label}
          className={mode === o.id ? "active" : ""} onClick={() => choose(o.id)}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}
