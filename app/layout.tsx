import type { Metadata } from "next";
import "./globals.css";
import { themeMode } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
      : undefined,
  title: "LinkHub — todos tus enlaces en un solo lugar",
  description: "Crea tu página de enlaces con estilos gamer, empresa, tienda y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = themeMode();
  return (
    <html lang="es" data-theme={theme === "auto" ? undefined : theme}>
      <body>{children}</body>
    </html>
  );
}
