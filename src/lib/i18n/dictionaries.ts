import type { Lang } from "./config";
import { fr, type Dictionary } from "./fr";
import { en } from "./en";
import { es } from "./es";

/**
 * Les dictionnaires, indexés par langue.
 *
 * Écrit une fois et importé partout, y compris hors de React : l'export
 * vidéo, l'encodeur et le moteur d'analyse ont eux aussi des textes à
 * afficher, et n'ont aucun contexte à lire.
 *
 * POURQUOI UNE TABLE ET PAS UN TERNAIRE
 *
 * Ces endroits choisissaient la langue avec un « anglais ou français ».
 * Ajouter l'espagnol n'aurait rien cassé : il serait simplement retombé en
 * français, silencieusement, dans une dizaine de fichiers. Avec une table
 * indexée par Lang, la compilation exige une entrée par langue déclarée, et
 * la prochaine langue ajoutée signalera elle-même tout ce qui lui manque.
 */
export const DICTIONARIES: Record<Lang, Dictionary> = { fr, en, es };

export type { Dictionary };
