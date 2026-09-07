import type { Lang } from "./config";

// Formatage des dates selon la langue.
//
// POURQUOI UNE COUCHE DÉDIÉE
//
// Les appels à toLocaleDateString portaient « fr-FR » en dur, dans six
// fichiers. Une application passée en anglais affichait donc « 31 août 2026 »
// à côté d'un texte anglais. Le fuseau, lui, reste figé sur Europe/Paris et
// c'est délibéré : il assure que le serveur et le navigateur produisent la
// même chaîne, sans quoi React signale un écart d'hydratation.

const LOCALES: Record<Lang, string> = { fr: "fr-FR", en: "en-GB" };

const FUSEAU = "Europe/Paris";

/** Date longue : « 5 septembre 2026 » / « 5 September 2026 ». */
export function formatLongDate(value: string | number | Date, lang: Lang) {
  return new Date(value).toLocaleDateString(LOCALES[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: FUSEAU,
  });
}

/** Date courte : « 5 sept. 2026 » / « 5 Sep 2026 ». */
export function formatShortDate(value: string | number | Date, lang: Lang) {
  return new Date(value).toLocaleDateString(LOCALES[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: FUSEAU,
  });
}

/** Jour et mois seuls : « 5 sept. » / « 5 Sep ». */
export function formatDayMonth(value: string | number | Date, lang: Lang) {
  return new Date(value).toLocaleDateString(LOCALES[lang], {
    day: "numeric",
    month: "short",
    timeZone: FUSEAU,
  });
}

/** Date et heure : « 5 sept. 2026, 14:32 ». */
export function formatDateTime(value: string | number | Date, lang: Lang) {
  return new Date(value).toLocaleString(LOCALES[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSEAU,
  });
}
