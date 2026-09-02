import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` fige l'identité de l'application aux yeux du navigateur. Sans lui,
    // l'identifiant est déduit de `start_url` : le jour où celle-ci change,
    // l'installation existante est traitée comme une autre application.
    id: "/",
    name: "CalisIQ",
    short_name: "CalisIQ",
    description: "Analyse biomécanique de tes mouvements de calisthénie",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f19",
    theme_color: "#0b0f19",
    // Icônes générées à partir du logo par scripts/import-logo.mjs, servies
    // en statique. Elles remplacent un rendu à la volée qui dessinait juste
    // les lettres « CQ » sur un dégradé, faute de visuel disponible.
    // La version "maskable" est la même à 20 % de marge : Android recadre ces
    // icônes en cercle ou en goutte et rognerait l'anneau sans cette réserve.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
