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
      <head>
        {/*
          Capture de l'événement d'installation, au plus tôt.

          Chrome ne l'émet qu'une fois, au chargement initial de la page, et
          ne le rejoue jamais. Un écouteur posé dans le composant du profil
          arrive donc toujours après la bataille : l'utilisateur y navigue
          plusieurs secondes plus tard, l'événement est passé depuis longtemps
          et le bouton d'installation restait muet.

          On le retient donc ici, dans le HTML initial, avant même que React
          n'hydrate quoi que ce soit. Le bouton viendra le chercher au moment
          où il en a besoin. Le `preventDefault` empêche au passage Chrome
          d'afficher sa propre bannière au moment qui l'arrange.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: [
              "(function(){",
              "window.__calisiqInstallPrompt=null;",
              "window.addEventListener('beforeinstallprompt',function(e){",
              "e.preventDefault();",
              "window.__calisiqInstallPrompt=e;",
              "window.dispatchEvent(new Event('calisiq:installprompt'));",
              "});",
              "window.addEventListener('appinstalled',function(){",
              "window.__calisiqInstallPrompt=null;",
              "window.dispatchEvent(new Event('calisiq:installprompt'));",
              "});",
              "})();",
            ].join(""),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
