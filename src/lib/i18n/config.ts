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

export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "fr";
export const LANG_COOKIE = "calisiq_lang";

// Un an : la langue est un choix durable, pas une préférence de session.
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LANG_LABELS: Record<Lang, string> = {
  fr: "Français",
  en: "English",
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}
