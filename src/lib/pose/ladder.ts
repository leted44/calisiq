import { VARIATION_DIFFICULTY } from "./level";
import { figureFamily } from "./report";

/**
 * L'échelle des variantes d'une figure, de la plus simple à la plus dure.
 *
 * POURQUOI CE DÉCOUPAGE
 *
 * Suivre sa progression, ce n'est pas lire une liste de résultats, c'est
 * savoir où l'on se situe sur un chemin qui a un début et une fin. Une figure
 * est ce chemin ; ses variantes en sont les barreaux. Les deux pages de
 * progression, la vue d'ensemble et le détail d'une figure, décrivent donc la
 * même structure et la lisent ici plutôt que de la reconstruire chacune de
 * son côté.
 *
 * L'ordre des barreaux vient de VARIATION_DIFFICULTY, la table qui sert déjà
 * à calculer les points. Position et score viennent ainsi de la même source
 * et ne peuvent pas se contredire.
 */

// Deux variations de handstand forment leur propre famille technique, parce
// que leurs critères d'analyse diffèrent. Pour se repérer, elles appartiennent
// à la famille du handstand : c'est ainsi que le sélecteur de figures les
// présente, et la progression doit raconter la même histoire.
const FAMILLES_FONDUES: Record<string, string> = {
  handstand_push_up: "handstand",
  one_arm_handstand: "handstand",
};

/** Famille d'affichage d'une variation. Clé des libellés `t.figures`. */
export function ladderFamily(variation: string): string {
  const famille = figureFamily(variation);
  return FAMILLES_FONDUES[famille] ?? famille;
}

/**
 * Ordre des figures dans la collection.
 *
 * Les figures de force d'abord, les fondamentaux ensuite. Ce n'est pas un
 * ordre de difficulté mais un ordre d'envie : on ouvre l'application pour la
 * planche et le front lever, pas pour les pompes, même si les pompes viennent
 * avant dans la pratique.
 */
export const LADDER_ORDER = [
  "planche",
  "front_lever",
  "human_flag",
  "dragon_flag",
  "handstand",
  "traction",
  "dips",
  "pompes",
  "pistol",
] as const;

/**
 * Clé d'une figure, et clé de ses libellés dans `t.figures`.
 *
 * Le type vient de la liste elle-même : une figure ajoutée ici sans son
 * libellé casse la compilation, ce qui est exactement ce qu'on veut.
 */
export type LadderFamily = (typeof LADDER_ORDER)[number];

export type Ladder = { family: LadderFamily; variations: string[] };

export function figureLadders(): Ladder[] {
  const parFamille = new Map<string, string[]>();
  for (const variation of Object.keys(VARIATION_DIFFICULTY)) {
    const cle = ladderFamily(variation);
    parFamille.set(cle, [...(parFamille.get(cle) ?? []), variation]);
  }

  for (const barreaux of parFamille.values()) {
    barreaux.sort((a, b) => VARIATION_DIFFICULTY[a] - VARIATION_DIFFICULTY[b]);
  }

  return LADDER_ORDER.filter((f) => parFamille.has(f)).map((family) => ({
    family,
    variations: parFamille.get(family)!,
  }));
}

/** Une seule échelle, ou null si la clé ne désigne aucune figure connue. */
export function figureLadder(family: string): Ladder | null {
  return figureLadders().find((l) => l.family === family) ?? null;
}
