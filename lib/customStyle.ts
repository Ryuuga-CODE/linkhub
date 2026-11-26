// Personalización encima del tema: colores, forma y relleno de botones y tipografía.
// Es código puro (sin servidor) para usarlo también en la vista previa en vivo del panel.

export type CustomStyle = {
  colorButton: string;
  colorButtonText: string;
  colorText: string;
  colorBg: string;
  colorBg2: string;
  buttonShape: string;
  buttonFill: string;
  font: string;
};

export const STYLE_FIELDS = ["colorButton", "colorButtonText", "colorText", "colorBg", "colorBg2", "buttonShape", "buttonFill", "font"] as const;

export const BUTTON_SHAPES = [
  { id: "", name: "Del tema" },
  { id: "pill", name: "Píldora" },
  { id: "rounded", name: "Redondeado" },
  { id: "square", name: "Cuadrado" },
];

export const BUTTON_FILLS = [
  { id: "", name: "Del tema" },
  { id: "solid", name: "Relleno" },
  { id: "outline", name: "Contorno" },
  { id: "glass", name: "Cristal" },
  { id: "hard", name: "Sombra dura" },
];

// Fuentes de Google Fonts (se cargan solo si el perfil las usa)
export const FONTS = [
  { id: "", name: "Del tema", css: "" },
  { id: "inter", name: "Inter", css: "'Inter', sans-serif", g: "Inter:wght@400;700" },
  { id: "poppins", name: "Poppins", css: "'Poppins', sans-serif", g: "Poppins:wght@400;700" },
  { id: "montserrat", name: "Montserrat", css: "'Montserrat', sans-serif", g: "Montserrat:wght@400;800" },
  { id: "space", name: "Space Grotesk", css: "'Space Grotesk', sans-serif", g: "Space+Grotesk:wght@400;700" },
  { id: "playfair", name: "Playfair Display", css: "'Playfair Display', serif", g: "Playfair+Display:wght@400;700" },
  { id: "bebas", name: "Bebas Neue", css: "'Bebas Neue', sans-serif", g: "Bebas+Neue" },
  { id: "pixel", name: "Pixel (Press Start 2P)", css: "'Press Start 2P', monospace", g: "Press+Start+2P" },
  { id: "pacifico", name: "Pacifico", css: "'Pacifico', cursive", g: "Pacifico" },
  { id: "nunito", name: "Nunito", css: "'Nunito', sans-serif", g: "Nunito:wght@400;800" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string) => HEX.test(v);

export function fontHref(font: string) {
  const f = FONTS.find((x) => x.id === font);
  return f?.g ? `https://fonts.googleapis.com/css2?family=${f.g}&display=swap` : null;
}

/** Variables CSS y clases que aplica la personalización sobre `.profile`. */
export function profileStyle(c: Partial<CustomStyle>) {
  const vars: Record<string, string> = {};
  const classes: string[] = [];
  if (c.colorButton && isHex(c.colorButton)) { vars["--p-btn-bg"] = c.colorButton; vars["--p-btn-border"] = c.colorButton; vars["--p-ring"] = c.colorButton; }
  if (c.colorButtonText && isHex(c.colorButtonText)) vars["--p-btn-fg"] = c.colorButtonText;
  if (c.colorText && isHex(c.colorText)) { vars["--p-fg"] = c.colorText; vars["--p-muted"] = c.colorText; }
  if (c.colorBg && isHex(c.colorBg)) {
    const bg2 = c.colorBg2 && isHex(c.colorBg2) ? c.colorBg2 : "";
    vars["--p-bg"] = bg2 ? `linear-gradient(160deg, ${c.colorBg}, ${bg2})` : c.colorBg;
    vars["--p-halo"] = c.colorBg;
  }
  const radius: Record<string, string> = { pill: "999px", rounded: "14px", square: "0px" };
  if (radius[c.buttonShape ?? ""]) { vars["--p-btn-radius"] = radius[c.buttonShape!]; classes.push("custom-shape"); }
  if (BUTTON_FILLS.some((f) => f.id && f.id === c.buttonFill)) classes.push(`fill-${c.buttonFill}`);
  const font = FONTS.find((f) => f.id && f.id === c.font);
  if (font) vars["--p-font"] = font.css;
  return { vars, className: classes.join(" ") };
}
