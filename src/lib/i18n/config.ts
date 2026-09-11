// Langue de l'interface.
//
// POURQUOI UN COOKIE ET PAS localStorage
//
// La moitié des pages sont des composants serveur : l'historique, les
// statistiques, la calibration, et les métadonnées du document. Le serveur ne
// voit pas localStorage, donc ces pages rendraient en français puis
// basculeraient à l'hydratation — un clignotement visible à chaque
// navigation. Un cookie est lisible des deux côtés, et la page arrive déjà
// dans la bonne langue.
//
// POURQUOI PAS DE PRÉFIXE D'URL
//
// next-intl et consorts placent la langue dans le chemin (/fr/..., /en/...).
// C'est la bonne solution quand les pages doivent être indexées séparément
// par Google. Ici une seule page est publique, la landing, et tout le reste
// est derrière authentification : le coût en refonte du routage ne serait
// payé par rien.

export const LANGS = ["fr", "en", "es"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "fr";
export const LANG_COOKIE = "calisiq_lang";

// Un an : la langue est un choix durable, pas une préférence de session.
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LANG_LABELS: Record<Lang, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

/**
 * Langue à servir à quelqu'un qui n'a encore rien choisi, déduite de
 * l'en-tête Accept-Language du navigateur.
 *
 * POURQUOI LA LANGUE DU NAVIGATEUR ET NON LE PAYS
 *
 * Le pays se devine aussi, par l'adresse IP, et c'est tentant. Mais il répond
 * à la mauvaise question : un Français en vacances à Barcelone recevrait
 * l'espagnol, et un hispanophone installé à Lyon recevrait le français. La
 * langue du navigateur est le réglage que la personne a elle-même choisi sur
 * son téléphone. C'est la seule qui dise vraiment ce qu'elle lit.
 *
 * REPLI SUR L'ANGLAIS, PAS SUR LE FRANÇAIS
 *
 * Un navigateur allemand ou portugais ne correspond à aucune des trois
 * langues. Lui servir du français parce que c'est la langue d'origine du
 * projet n'a pas de sens de son point de vue : l'anglais est la langue qu'il
 * a le plus de chances de lire. Les francophones, eux, reçoivent le français
 * par leur propre en-tête, sans dépendre de ce repli.
 */
export const FALLBACK_LANG: Lang = "en";

export function negotiateLang(header: string | null | undefined): Lang {
  if (!header) return FALLBACK_LANG;

  // « fr-CA,fr;q=0.9,en;q=0.8 » : chaque entrée porte une préférence, la
  // meilleure d'abord une fois triée. Sans q, la valeur vaut 1 par défaut.
  const preferences = header
    .split(",")
    .map((entree) => {
      const [balise, ...parametres] = entree.trim().split(";");
      const q = parametres
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const poids = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        // Seule la partie avant le tiret nous intéresse : es-419 et es-ES
        // sont la même langue pour nous.
        base: balise.trim().toLowerCase().split("-")[0],
        poids: Number.isFinite(poids) ? poids : 0,
      };
    })
    .filter((p) => p.poids > 0)
    .sort((a, b) => b.poids - a.poids);

  for (const { base } of preferences) {
    if (isLang(base)) return base;
  }
  return FALLBACK_LANG;
}
