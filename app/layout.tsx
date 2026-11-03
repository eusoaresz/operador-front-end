import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "UniBus · Painel do operador",
  description: "Cuidando do caminho até a universidade.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
