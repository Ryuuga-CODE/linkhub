"use client";

import { useRef } from "react";
import { updateStyle } from "@/app/actions";
import { BUTTON_FILLS, BUTTON_SHAPES, FONTS, fontHref, profileStyle, type CustomStyle } from "@/lib/customStyle";

const COLORS: { key: keyof CustomStyle; label: string; fallback: string }[] = [
  { key: "colorButton", label: "Botones", fallback: "#6d28d9" },
  { key: "colorButtonText", label: "Texto de botones", fallback: "#ffffff" },
  { key: "colorText", label: "Texto", fallback: "#111111" },
  { key: "colorBg", label: "Fondo", fallback: "#f5f3ff" },
  { key: "colorBg2", label: "Fondo (degradado)", fallback: "#c4b5fd" },
];

/** Formulario de estilo con vista previa instantánea en el móvil del panel. */
export function StyleEditor({ initial }: { initial: CustomStyle }) {
  const form = useRef<HTMLFormElement>(null);
  const applied = useRef<string[]>([]);

  function read(): CustomStyle {
    const fd = new FormData(form.current!);
    const v = (k: string) => String(fd.get(k) ?? "");
    const c = (k: string) => (fd.get(`use_${k}`) === "on" ? v(k) : "");
    return {
      colorButton: c("colorButton"), colorButtonText: c("colorButtonText"), colorText: c("colorText"),
      colorBg: c("colorBg"), colorBg2: c("colorBg") ? c("colorBg2") : "",
      buttonShape: v("buttonShape"), buttonFill: v("buttonFill"), font: v("font"),
    };
  }

  function preview() {
    const el = document.querySelector<HTMLElement>(".phone .profile");
    if (!el) return;
    const style = read();
    const { vars, className } = profileStyle(style);
    // Quita lo aplicado antes y pone lo nuevo
    for (const k of applied.current) el.style.removeProperty(k);
    el.classList.remove("custom-shape", ...BUTTON_FILLS.map((f) => `fill-${f.id}`));
    for (const [k, val] of Object.entries(vars)) el.style.setProperty(k, val);
    applied.current = Object.keys(vars);
    if (className) el.classList.add(...className.split(" "));
    const href = fontHref(style.font);
    if (href && !document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = href;
      document.head.appendChild(link);
    }
  }

  return (
    <form ref={form} action={updateStyle} className="stack" onChange={preview} onInput={preview}>
      <div className="color-grid">
        {COLORS.map(({ key, label, fallback }) => (
          <div key={key} className="color-field">
            <label className="check">
              <input type="checkbox" name={`use_${key}`} defaultChecked={!!initial[key]} />
              {label}
            </label>
            <input type="color" name={key} defaultValue={initial[key] || fallback} aria-label={label} />
          </div>
        ))}
      </div>
      <p className="muted">Marca un color para usarlo en lugar del del tema. Si marcas los dos fondos, se hace un degradado.</p>
      <div className="select-row">
        <label>Forma de botones
          <select name="buttonShape" defaultValue={initial.buttonShape}>
            {BUTTON_SHAPES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>Estilo de botones
          <select name="buttonFill" defaultValue={initial.buttonFill}>
            {BUTTON_FILLS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>Tipografía
          <select name="font" defaultValue={initial.font}>
            {FONTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      </div>
      <div className="uploader-actions">
        <button className="btn">Guardar estilo</button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            form.current!.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((c) => (c.checked = false));
            form.current!.querySelectorAll<HTMLSelectElement>("select").forEach((s) => (s.value = ""));
            preview();
          }}
        >
          Volver al estilo del tema
        </button>
      </div>
    </form>
  );
}
