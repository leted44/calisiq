import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CalisIQ",
  description: "Analyse biomécanique de tes mouvements de calisthénie",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalisIQ",
  },
  // Pas de bloc `icons` : src/app/icon.png et src/app/apple-icon.png sont
  // détectés par Next, qui écrit les balises <link> lui-même. Le déclarer ici
  // reprendrait la main sur ces fichiers et pointerait vers l'ancienne route
  // /icon/[size], supprimée avec le rendu « CQ » qu'elle générait.
};

export const viewport: Viewport = {
  themeColor: "#0b0f19",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
