import { cookies } from "next/headers";

export type ThemeMode = "auto" | "light" | "dark";

/** Tema elegido para la interfaz (panel, inicio…); "auto" sigue al sistema. */
export function themeMode(): ThemeMode {
  const v = cookies().get("lh_theme")?.value;
  return v === "light" || v === "dark" ? v : "auto";
}
