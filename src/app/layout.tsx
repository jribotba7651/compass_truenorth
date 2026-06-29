import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Curio | Mapa del Deseo",
  description:
    "Entretenimiento y autoexploracion para adultos, con age gate 18+ y consentimiento explicito.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
