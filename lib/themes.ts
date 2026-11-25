export type Theme = { id: string; name: string; description: string; emoji: string };

// Los estilos de cada tema viven en app/globals.css bajo .theme-<id>
export const THEMES: Theme[] = [
  { id: "gamer", name: "Gamer", description: "Oscuro, neón y brillos RGB", emoji: "🎮" },
  { id: "empresa", name: "Empresa", description: "Sobrio, limpio y profesional", emoji: "💼" },
  { id: "tienda", name: "Tienda", description: "Cálido, botones grandes para vender", emoji: "🛍️" },
  { id: "creador", name: "Creador", description: "Degradados vibrantes para creadores", emoji: "✨" },
  { id: "minimal", name: "Minimal", description: "Blanco y negro, sin distracciones", emoji: "◻️" },
  { id: "naturaleza", name: "Naturaleza", description: "Tonos verdes y tierra", emoji: "🌿" },
];

export const THEME_IDS = THEMES.map((t) => t.id);
