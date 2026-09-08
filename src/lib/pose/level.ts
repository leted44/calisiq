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
  one_leg_human_flag: 65,
  one_leg_front_lever: 58,
  handstand_push_up: 60,
  full_dragon_flag: 65,

  // Avancé. Une minorité des pratiquants y arrive.
  straddle_planche: 70,
  straddle_front_lever: 72,
  straddle_human_flag: 75,

  planche_push_up: 92,

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
 * Durée, en secondes, à partir de laquelle une figure compte comme pleinement
 * tenue. Au-delà, tenir plus longtemps n'ajoute plus de niveau.
 *
 * POURQUOI UN PLAFOND
 *
 * Sans lui, une full planche tenue soixante secondes vaudrait bien plus
 * qu'une full planche tenue huit, alors que les deux prouvent exactement la
 * même chose : la figure est acquise. Le temps supplémentaire relève de
 * l'endurance, que l'application suit déjà à part dans la courbe de
 * progression.
 *
 * POURQUOI LE SEUIL BAISSE QUAND LA FIGURE MONTE
 *
 * C'est le point important. Cinq secondes de full planche est une performance
 * reconnue ; cinq secondes de tuck planche ne prouve rien, tout le monde y
 * arrive. Plus la figure est dure, moins il faut de temps pour qu'elle soit
 * validée. Les valeurs suivent les repères admis dans le milieu.
 *
 * Le handstand fait exception à la hausse : c'est une figure d'équilibre
 * autant que de force, et sa difficulté réelle est justement de durer.
 *
 * Les exercices à répétition sont absents : ils n'ont pas de hold, leur
 * volume se mesure en répétitions.
 */
export const HOLD_TARGET_SECONDS: Record<string, number> = {
  // Planche. Cinq secondes en full est le repère classique d'une figure
  // acquise ; en tuck, on attend trois fois plus.
  tuck_planche: 15,
  advanced_tuck_planche: 12,
  straddle_planche: 8,
  full_planche: 5,

  // Handstand. Seule famille où le seuil monte : tenir est la difficulté.
  handstand: 20,
  one_arm_handstand: 5,

  // Front lever, même logique que la planche.
  tuck_front_lever: 15,
  advanced_tuck_front_lever: 12,
  one_leg_front_lever: 10,
  straddle_front_lever: 8,
  full_front_lever: 5,
  one_arm_front_lever: 3,

  // Dragon flag. Seuils un peu plus longs qu'un levier de même rang : la
  // position est moins exigeante en force pure de traction.
  tuck_dragon_flag: 12,
  one_leg_dragon_flag: 10,
  full_dragon_flag: 8,

  // Drapeau. Seuils courts : la position est brutale, personne ne s'y
  // installe confortablement.
  tuck_human_flag: 10,
  one_leg_human_flag: 8,
  straddle_human_flag: 7,
  full_human_flag: 5,
};

/**
 * Plancher du facteur de durée.
 *
 * La durée MODULE le niveau, elle ne le décide pas. Sans plancher, une full
 * planche impeccable filmée deux secondes tomberait à presque rien, ce qui
 * serait absurde : la figure a bien été tenue, elle a juste été filmée court.
 * Entre 0,5 et 1, la durée pèse assez pour compter sans écraser la mesure
 * technique, qui reste l'objet de l'application.
 */
const HOLD_FACTOR_FLOOR = 0.5;

/**
 * Facteur de durée, entre le plancher et 1.
 *
 * Racine carrée plutôt que proportion directe : les premières secondes valent
 * beaucoup plus que les dernières. Passer de deux à cinq secondes est un vrai
 * progrès, passer de trente à trente-trois n'en est pas un.
 *
 * Vaut 1 quand la durée est inconnue. Une mesure qui a échoué ne doit pas se
 * transformer en pénalité silencieuse.
 */
export function holdFactor(
  progression: string,
  holdSeconds: number | null | undefined
): number {
  const cible = HOLD_TARGET_SECONDS[progression];
  if (cible === undefined) return 1;
  if (holdSeconds === null || holdSeconds === undefined) return 1;
  const part = Math.min(1, Math.sqrt(Math.max(0, holdSeconds) / cible));
  return HOLD_FACTOR_FLOOR + (1 - HOLD_FACTOR_FLOOR) * part;
}

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

/**
 * Points d'une prise : difficulté × qualité × durée.
 *
 * La durée n'entre pas dans la note sur 10, et c'est délibéré. La note mesure
 * la qualité de la forme ; y mêler l'endurance la rendrait illisible, puisque
 * l'utilisateur ne saurait plus si un 6 vient de sa technique ou de son
 * souffle. Le niveau, lui, doit dire à quel point la prise est impressionnante,
 * et une figure tenue deux secondes ne l'est pas autant que la même tenue huit.
 */
export function levelPoints(
  progression: string,
  score: number,
  holdSeconds?: number | null
): number {
  const difficulty = VARIATION_DIFFICULTY[progression];
  if (difficulty === undefined) return 0;
  const quality = Math.max(0, Math.min(1, score / 10));
  return (
    difficulty *
    Math.pow(quality, QUALITY_EXPONENT) *
    holdFactor(progression, holdSeconds)
  );
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

export function tierFor(
  progression: string,
  score: number,
  holdSeconds?: number | null
): Tier {
  return tierForPoints(levelPoints(progression, score, holdSeconds));
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
 * Mêmes paliers, en couleurs directes.
 *
 * TIER_STYLES ne sert qu'à l'interface : ce sont des classes Tailwind, que le
 * canvas de l'export vidéo ne sait pas lire. Les deux tables décrivent le même
 * palier et doivent bouger ensemble — d'où leur voisinage immédiat plutôt
 * qu'une couleur recopiée au fond d'exportVideo.
 */
export const TIER_CANVAS_COLORS: Record<Tier, string> = {
  foundations: "#cbd5e1",
  solid: "#67e8f9",
  mastery: "#4ade80",
  elite: "#c4b5fd",
  legendary: "#fcd34d",
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
  best: { progression: string; score: number; holdSeconds?: number | null }[]
): number {
  const parVariation = new Map<string, number>();
  for (const { progression, score, holdSeconds } of best) {
    const points = levelPoints(progression, score, holdSeconds);
    const connu = parVariation.get(progression) ?? 0;
    if (points > connu) parVariation.set(progression, points);
  }
  return [...parVariation.values()].reduce((somme, p) => somme + p, 0);
}

/** Vrai si la progression a une difficulté déclarée, donc un niveau calculable. */
export function hasLevel(progression: AnyProgression | string): boolean {
  return VARIATION_DIFFICULTY[progression] !== undefined;
}
