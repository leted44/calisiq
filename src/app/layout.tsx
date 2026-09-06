import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getLang, getDictionary } from "@/lib/i18n/server";
import { LanguageProvider } from "@/lib/i18n/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Métadonnées dépendantes de la langue : `generateMetadata` plutôt qu'un
// objet figé, sinon la description du document resterait française pour un
// utilisateur anglophone, y compris dans les aperçus de partage.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
  title: "CalisIQ",
  description: t.meta.description,
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
}

export const viewport: Viewport = {
  themeColor: "#0b0f19",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Lue sur le serveur : la page arrive déjà dans la bonne langue, sans
  // clignotement à l'hydratation, et l'attribut lang du document est correct
  // pour les lecteurs d'écran et la traduction automatique du navigateur.
  const lang = await getLang();
  return (
    <html
      lang={lang}
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
      <body className="min-h-full flex flex-col">
        <LanguageProvider lang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
