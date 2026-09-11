import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "./config";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

export function dictionaryFor(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}

/**
 * Langue choisie, lue depuis le cookie. Réservé aux composants serveur.
 *
 * Retombe sur le français quand le cookie est absent ou porte une valeur
 * inconnue — une langue retirée du produit ne doit pas casser la page de
 * quelqu'un qui l'avait sélectionnée.
 */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

/** Dictionnaire de la langue courante, pour un composant serveur. */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaryFor(await getLang());
}
