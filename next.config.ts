import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Ancienne adresse Vercel vers le domaine définitif.
        //
        // Vercel ne coupe pas l'adresse .vercel.app quand on branche un
        // domaine : elle continue de servir le site, ce qui donne deux
        // adresses pour un même contenu. C'est mauvais pour le référencement,
        // et surtout les liens déjà partagés continueraient de vivre sur
        // l'ancienne. Cette règle les rapatrie.
        //
        // Permanente : les moteurs et les navigateurs retiennent la
        // redirection, et les liens partagés finissent par pointer d'eux-mêmes
        // au bon endroit.
        source: "/:path*",
        has: [{ type: "host", value: "calisiq.vercel.app" }],
        destination: "https://calisiq.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
