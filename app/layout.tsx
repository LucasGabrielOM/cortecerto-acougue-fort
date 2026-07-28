import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CorteCerto — Controle do Açougue",
  description:
    "Controle diário de quebra de carnes, análises mensais e organização de folgas em Kanban.",
  openGraph: {
    title: "CorteCerto — Controle do Açougue",
    description: "Quebras e folgas organizadas em um só lugar.",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CorteCerto — Controle do Açougue",
    description: "Quebras e folgas organizadas em um só lugar.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
