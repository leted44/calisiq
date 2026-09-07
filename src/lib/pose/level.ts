import type { AnyProgression } from "./grid";

// Niveau atteint par une prise : difficulté de la variation × qualité
// d'exécution.
//
// POURQUOI PAS DES PALIERS SUR LA NOTE SEULE
//
// C'est le piège évident, et il inverse la réalité. Un 9/10 en tuck planche
// et un 9/10 en full planche ne sont pas le même exploit. Des paliers posés
// sur la note brute feraient d'un tuck parfait un exploit légendaire pendant
// qu'une full planche tenue moyennement resterait au bas de l'échelle.
//
// La note dit COMMENT c'est exécuté. Le niveau doit dire OÙ ça place. Les
// deux sont utiles, ils ne répondent pas à la même question, et l'application
// affiche déjà la note : c'est la seconde information qui manquait.
//
// CE QUE ÇA DÉBLOQUE
//
// Un chiffre unique, comparable entre TOUTES les figures. Un full front lever
// à 7 vaut plus qu'un tuck front lever à 10, et l'échelle le dit. C'est ce
// dont un classement, un profil public ou une comparaison entre deux
// personnes ont besoin, et rien de tout cela n'est possible avec des notes
// par figure qui ne se comparent pas entre elles.

/**
 * Difficulté absolue de chaque variation, de 0 à 100.
 *
 * Absolue et non relative à sa propre progression : le rang d'une variation
 * dans sa famille ne dit rien de sa difficulté réelle. Un tuck planche et un
 * tuck front lever sont tous deux premiers de leur suite et ne demandent pas
 * le même niveau ; une pompe inclinée est première comme l'est un tuck
 * planche, à des années d'écart.
 *
 * Ces valeurs sont un JUGEMENT, pas une mesure, contrairement aux seuils
 * d'angles. Elles suivent l'ordre de difficulté admis dans le milieu, et se
 * corrigeront si l'usage montre qu'une figure est mal placée.
 */
export const VARIATION_DIFFICULTY: Record<string, number> = {
  // Fondamentaux accessibles à quelqu'un qui débute.
  incline_push_up: 5,
  bench_dip: 8,
  australian_pull_up: 10,
  push_up: 12,
  box_pistol_squat: 18,
  decline_push_up: 20,
  parallel_dip: 22,
  strict_pull_up: 25,

  // Premières figures de force. Le seuil où la calisthénie commence.
  tuck_planche: 30,
  tuck_dragon_flag: 30,
  handstand: 35,
  tuck_front_lever: 35,
  pistol_squat: 35,

  // Intermédiaire. Plusieurs mois de travail spécifique.
  advanced_tuck_planche: 45,
  one_leg_dragon_flag: 45,
  advanced_tuck_front_lever: 48,
  tuck_human_flag: 55,
  one_leg_front_lever: 58,
  handstand_push_up: 60,
  full_dragon_flag: 65,

  // Avancé. Une minorité des pratiquants y arrive.
  straddle_planche: 70,
  straddle_front_lever: 72,
  straddle_human_flag: 75,

  // Élite. Des années, et pas pour tout le monde.
  full_human_flag: 88,
  full_front_lever: 90,
  full_planche: 95,

  // Sommets, pas encore analysables mais présents pour que l'échelle soit
  // complète le jour où ils le seront.
  one_arm_handstand: 100,
  one_arm_front_lever: 100,
};

/**
 * Exposant appliqué à la qualité d'exécution.
 *
 * Supérieur à 1 délibérément : une figure difficile mal tenue ne doit pas
 * battre une figure plus simple tenue proprement. À exposant 1, une full
 * planche cassée à 4/10 dépasserait un tuck planche irréprochable, ce que
 * personne ne trouverait juste. À 1,5, le tuck l'emporte, et la full ne passe
 * devant qu'à partir d'une exécution correcte.
 */
const QUALITY_EXPONENT = 1.5;

/** Points d'une prise. Zéro si la variation n'a pas de difficulté connue. */
export function levelPoints(progression: string, score: number): number {
  const difficulty = VARIATION_DIFFICULTY[progression];
  if (difficulty === undefined) return 0;
  const quality = Math.max(0, Math.min(1, score / 10));
  return difficulty * Math.pow(quality, QUALITY_EXPONENT);
}

export const TIERS = [
  "foundations",
  "solid",
  "mastery",
  "elite",
  "legendary",
] as const;
export type Tier = (typeof TIERS)[number];

/**
 * Seuils de palier.
 *
 * Cinq paliers et pas six : au-delà, chacun perd son sens et personne ne
 * retient l'échelle. Le dernier est calibré pour rester rare — il demande une
 * figure de niveau full tenue à près de 9/10. Une full planche à 9 y arrive,
 * une straddle parfaite non. C'est ce qui lui garde sa valeur : un palier
 * légendaire que tout le monde atteint ne veut plus rien dire.
 */
const TIER_MIN: Record<Tier, number> = {
  foundations: 0,
  solid: 20,
  mastery: 40,
  elite: 60,
  legendary: 80,
};

export function tierForPoints(points: number): Tier {
  if (points >= TIER_MIN.legendary) return "legendary";
  if (points >= TIER_MIN.elite) return "elite";
  if (points >= TIER_MIN.mastery) return "mastery";
  if (points >= TIER_MIN.solid) return "solid";
  return "foundations";
}

export function tierFor(progression: string, score: number): Tier {
  return tierForPoints(levelPoints(progression, score));
}

/**
 * Points restants avant le palier suivant, et le palier visé.
 *
 * Null au sommet : rien n'est plus décourageant qu'une barre de progression
 * qui ne se remplit jamais parce qu'il n'y a plus rien après.
 */
export function nextTier(
  points: number
): { tier: Tier; remaining: number } | null {
  const courant = tierForPoints(points);
  const index = TIERS.indexOf(courant);
  if (index === TIERS.length - 1) return null;
  const suivant = TIERS[index + 1];
  return { tier: suivant, remaining: TIER_MIN[suivant] - points };
}

/** Classes de couleur par palier, du plus sobre au plus marqué. */
export const TIER_STYLES: Record<Tier, string> = {
  foundations: "border-slate-600/50 bg-slate-500/10 text-slate-300",
  solid: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  mastery: "border-green-500/40 bg-green-500/10 text-green-400",
  elite: "border-violet-500/45 bg-violet-500/10 text-violet-300",
  // Le seul palier à porter une lueur : il doit se voir sur une capture
  // d'écran partagée sans qu'on ait à lire le mot.
  legendary:
    "border-amber-400/60 bg-amber-400/15 text-amber-300 shadow-[0_0_18px_-4px_rgba(251,191,36,0.55)]",
};

/**
 * Niveau global d'un pratiquant : la somme de son meilleur résultat sur
 * chaque figure.
 *
 * La somme et non la moyenne, ni le maximum. Le maximum récompenserait une
 * spécialisation extrême et ignorerait tout le reste ; la moyenne punirait
 * celui qui travaille beaucoup de figures, puisque chaque nouvelle figure
 * commencée ferait baisser son niveau. La somme récompense l'étendue sans
 * pénaliser personne, ce qui est la seule forme juste ici.
 *
 * Un seul résultat par variation est retenu, le meilleur : répéter la même
 * figure ne doit pas gonfler un total.
 */
export function overallPoints(
  best: { progression: string; score: number }[]
): number {
  const parVariation = new Map<string, number>();
  for (const { progression, score } of best) {
    const points = levelPoints(progression, score);
    const connu = parVariation.get(progression) ?? 0;
    if (points > connu) parVariation.set(progression, points);
  }
  return [...parVariation.values()].reduce((somme, p) => somme + p, 0);
}

/** Vrai si la progression a une difficulté déclarée, donc un niveau calculable. */
export function hasLevel(progression: AnyProgression | string): boolean {
  return VARIATION_DIFFICULTY[progression] !== undefined;
}
