import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkHub — todos tus enlaces en un solo lugar",
  description: "Crea tu página de enlaces con estilos gamer, empresa, tienda y más.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
