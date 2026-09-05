import type { PoseAngles } from "./angles";

// Notation des mouvements dynamiques (répétitions), par opposition aux holds.
//
// POURQUOI UN MODULE SÉPARÉ
//
// Tout le pipeline existant repose sur `detectHoldWindow` : on cherche le
// segment le plus immobile de la vidéo, on prend la médiane des angles
// dessus, on compare à des seuils. Un mouvement dynamique n'a pas de segment
// immobile — sa qualité est justement dans la trajectoire. Le modèle de
// notation est donc différent, et le mettre ici évite de fragiliser un
// pipeline qui marche.
//
// LE PRINCIPE
//
// Une répétition est décrite par deux positions clés (basse et haute) et par
// la qualité du trajet entre les deux. On note donc trois choses :
//   1. les angles atteints en position basse,
//   2. les angles atteints en position haute,
//   3. des critères transversaux mesurés sur toute la répétition
//      (amplitude, stabilité du bassin, régularité entre répétitions).
//
// CE QUI EST RÉUTILISÉ TEL QUEL
//
// La sortie est volontairement un `CriterionScore[]`, exactement le type que
// produit déjà le scoring des holds. Tout l'aval — affichage du résultat,
// recommandations, export vidéo annotée — fonctionne alors sans modification.
// C'est ce qui rend l'ajout des dynamiques abordable : seule la façon de
// calculer les critères change, pas ce qui en sort.

// CE QUI A ÉTÉ VÉRIFIÉ
//
// La détection a été testée sur signaux fabriqués, faute de vidéos réelles à
// ce stade : comptage exact de 1, 3, 5 et 8 répétitions ; comptage toujours
// exact avec un bruit de +/- 6 degrés ; aucune répétition inventée sur une
// suspension immobile ; demi-répétitions (40 % d'amplitude) rejetées ;
// amplitude mesurée à 70 % sur des répétitions volontairement partielles ;
// oscillation de hanche nulle en strict contre 18 degrés en lancé.
//
// Ajouté avec la correction du tempo : trois secondes de maintien avant la
// première répétition ne gonflent plus sa durée (quatre durées à 1,60 s), une
// cadence de capture volontairement irrégulière laisse le tempo à 1,000 alors
// qu'une série réellement inégale (1 / 2 / 4 / 1,2 s) tombe à 0,429, et une
// vidéo qui démarre au milieu d'une descente ne produit plus de répétition
// fantôme.
//
// Ce qui reste à valider sur vidéo réelle, c'est la qualité du signal d'angle
// lui-même, pas l'algorithme qui le découpe.
//
// OÙ CE MODULE EST BRANCHÉ
//
// Les seuils par exercice vivent dans `REP_SCORING_GRID` (grid.ts), la
// conversion en `CriterionScore[]` dans `scoreReps` (scoring.ts), et
// `runAnalysis` choisit cette voie via `isRepProgression`. C'est là qu'est
// faite la substitution des angles 2D par leurs équivalents 3D, propre aux
// exercices à répétition.

// Signal qui pilote la détection : l'angle dont la valeur oscille le plus
// nettement entre le haut et le bas du mouvement. Pour une traction c'est le
// coude, pour un squat le genou.
export type DriverAngle = "elbowAngle" | "kneeAngle" | "hipAngle";

export type RepExerciseConfig = {
  /** Angle qui sert de signal de détection. */
  driver: DriverAngle;
  /**
   * Valeurs du signal caractérisant les deux extrémités du mouvement. Sur une
   * traction : bras tendus en bas (≈175°), bras pliés en haut (≈45°). L'ordre
   * n'a pas d'importance, seul l'écart compte.
   */
  extendedValue: number;
  flexedValue: number;
  /**
   * Fraction de l'amplitude théorique qu'une oscillation doit couvrir pour
   * compter comme une répétition. Sans ce garde-fou, le moindre tremblement
   * de la vidéo serait compté comme une rep.
   */
  minRangeRatio: number;
};

export type Rep = {
  /** Index de début et de fin dans le tableau d'angles fourni. */
  start: number;
  end: number;
  /** Index de l'image où le signal est le plus fléchi (position haute). */
  flexedIndex: number;
  /** Index de l'image où le signal est le plus tendu (position basse). */
  extendedIndex: number;
  /** Amplitude réellement parcourue par le signal, en degrés. */
  range: number;
};

/**
 * Découpe une série d'angles en répétitions.
 *
 * L'algorithme suit le signal pilote et bascule d'un état à l'autre chaque
 * fois qu'il franchit un seuil, avec une bande morte entre les deux seuils.
 * Cette hystérésis est indispensable : sans elle, un signal qui vibre autour
 * d'un seuil unique produirait des dizaines de fausses répétitions.
 */
export function detectReps(
  angles: PoseAngles[],
  config: RepExerciseConfig
): Rep[] {
  if (angles.length < 3) return [];

  const signal = angles.map((a) => a[config.driver]);
  const amplitude = Math.abs(config.extendedValue - config.flexedValue);
  if (amplitude < 1) return [];

  // Seuils placés à 30 % et 70 % de l'amplitude : la bande morte occupe donc
  // les 40 % du milieu, où aucun changement d'état n'est déclenché.
  const low = Math.min(config.extendedValue, config.flexedValue);
  const enterFlexed = low + amplitude * 0.3;
  const enterExtended = low + amplitude * 0.7;
  const flexedIsLow = config.flexedValue < config.extendedValue;

  const reps: Rep[] = [];
  let state: "flexed" | "extended" | null = null;
  // Début de la répétition en cours, null tant qu'aucun départ n'a été vu.
  //
  // POURQUOI PAS SIMPLEMENT L'INDEX DE LA DERNIÈRE TRANSITION
  //
  // La version précédente ouvrait la première répétition à l'instant où l'état
  // se fixait, c'est-à-dire dès que la personne atteignait la position tendue.
  // Sur une vidéo de handstand push-up, elle monte, se stabilise deux ou trois
  // secondes, puis commence : ces secondes d'attente étaient comptées dans la
  // durée de la première répétition, qui devenait bien plus longue que les
  // suivantes. Le critère de tempo, qui mesure la régularité des durées,
  // tombait alors à zéro sur une série pourtant régulière.
  //
  // Une répétition commence maintenant à la dernière image encore en position
  // tendue avant la descente. Conséquence voulue : une vidéo qui démarre au
  // milieu d'un mouvement ne produit plus de répétition fantôme, puisque son
  // départ n'a jamais été observé.
  let repStart: number | null = null;
  let lastExtendedIndex = 0;
  let flexedIndex = 0;
  let extendedIndex = 0;
  let minValue = Infinity;
  let maxValue = -Infinity;

  function isFlexed(value: number) {
    return flexedIsLow ? value < enterFlexed : value > enterExtended;
  }
  function isExtended(value: number) {
    return flexedIsLow ? value > enterExtended : value < enterFlexed;
  }

  for (let i = 0; i < signal.length; i++) {
    const value = signal[i];
    if (value < minValue) {
      minValue = value;
      if (flexedIsLow) flexedIndex = i;
      else extendedIndex = i;
    }
    if (value > maxValue) {
      maxValue = value;
      if (flexedIsLow) extendedIndex = i;
      else flexedIndex = i;
    }

    if (isExtended(value)) lastExtendedIndex = i;

    // Annotation explicite : `nextState` retombe sur `state` dans la bande
    // morte, et TypeScript ne sait pas inférer un type qui se référence
    // lui-même à travers cette branche.
    const nextState: "flexed" | "extended" | null = isFlexed(value)
      ? "flexed"
      : isExtended(value)
      ? "extended"
      : state;
    if (nextState === state || nextState === null) continue;

    // Une répétition est comptée au retour en position tendue : c'est le
    // point de départ et d'arrivée naturel du mouvement.
    if (state === "extended" && nextState === "flexed") {
      repStart = lastExtendedIndex;
    }
    if (state === "flexed" && nextState === "extended") {
      const range = maxValue - minValue;
      if (repStart !== null && range >= amplitude * config.minRangeRatio) {
        reps.push({ start: repStart, end: i, flexedIndex, extendedIndex, range });
      }
      repStart = null;
      minValue = value;
      maxValue = value;
      flexedIndex = i;
      extendedIndex = i;
    }
    state = nextState;
  }

  return reps;
}

/**
 * Amplitude moyenne réellement parcourue, rapportée à l'amplitude théorique.
 * 1 signifie que le mouvement est mené jusqu'au bout des deux côtés.
 */
export function rangeOfMotionRatio(
  reps: Rep[],
  config: RepExerciseConfig
): number {
  if (reps.length === 0) return 0;
  const amplitude = Math.abs(config.extendedValue - config.flexedValue);
  if (amplitude < 1) return 0;
  const mean = reps.reduce((sum, rep) => sum + rep.range, 0) / reps.length;
  return Math.min(1, mean / amplitude);
}

/**
 * Écart type de l'angle de hanche sur l'ensemble des répétitions.
 *
 * C'est la mesure du kipping : un tirage strict garde le tronc gainé et la
 * hanche quasi constante, un tirage lancé la fait osciller. Un critère que
 * personne ne peut s'auto-attribuer honnêtement, et qui distingue une vraie
 * traction d'un mouvement d'élan.
 */
export function hipSwing(angles: PoseAngles[], reps: Rep[]): number {
  if (reps.length === 0) return 0;
  const values: number[] = [];
  for (const rep of reps) {
    for (let i = rep.start; i <= rep.end && i < angles.length; i++) {
      values.push(angles[i].hipAngle);
    }
  }
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Régularité du tempo entre répétitions, en fraction (1 = parfaitement
 * régulier). Une série qui se dégrade se voit ici avant de se voir ailleurs :
 * les dernières répétitions s'allongent quand la force baisse.
 *
 * Les durées se mesurent EN SECONDES, jamais en nombre d'images. L'analyse
 * tourne sur requestAnimationFrame pendant une lecture en temps réel, donc
 * l'écart entre deux images capturées varie avec la charge de l'inférence :
 * compter les images revenait à noter la puissance du téléphone plutôt que le
 * rythme de l'athlète, et à faire varier la note d'un appareil à l'autre sur
 * la même vidéo.
 */
export function tempoRegularity(reps: Rep[], frameTimes: number[]): number {
  if (reps.length < 2) return 1;
  const durations = reps
    .map((rep) => (frameTimes[rep.end] ?? 0) - (frameTimes[rep.start] ?? 0))
    .filter((d) => d > 0);
  // Sans horodatage exploitable, mieux vaut ne pas pénaliser : le critère est
  // alors neutre plutôt que faux.
  if (durations.length < 2) return 1;
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  if (mean <= 0) return 1;
  const variance =
    durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / durations.length;
  return Math.max(0, 1 - Math.sqrt(variance) / mean);
}

// --- Exercices définis ---
//
// SEUILS DRAFT. Aucun échantillon réel, comme pour toute figure avant sa
// calibration. Les valeurs d'angle décrivent la géométrie attendue, pas des
// mesures observées.

export const REP_EXERCISES: Record<string, RepExerciseConfig> = {
  // Traction. Le coude passe de tendu en suspension à fermé menton au-dessus
  // de la barre : c'est le signal le plus net et le moins sensible à
  // l'orientation de la caméra.
  pull_up: {
    driver: "elbowAngle",
    extendedValue: 175,
    flexedValue: 45,
    minRangeRatio: 0.55,
  },
  // Dips. Même logique, amplitude plus courte.
  dip: {
    driver: "elbowAngle",
    extendedValue: 175,
    flexedValue: 80,
    minRangeRatio: 0.55,
  },
  // Pompes. Le coude reste le pilote, mais l'amplitude est plus faible encore
  // et le bruit de détection plus élevé : le garde-fou est relevé.
  push_up: {
    driver: "elbowAngle",
    extendedValue: 170,
    flexedValue: 75,
    minRangeRatio: 0.6,
  },
  // Pistol squat. Le genou pilote. Attention : la profondeur réelle se juge
  // aussi à la cheville, angle que `angles.ts` ne calcule pas encore.
  pistol_squat: {
    driver: "kneeAngle",
    extendedValue: 172,
    flexedValue: 45,
    minRangeRatio: 0.6,
  },
};

/**
 * Angle de hanche moyen sur l'ensemble des répétitions.
 *
 * À ne pas confondre avec `hipSwing`, qui en mesure l'écart type. Les deux
 * décrivent des fautes différentes et une seule ne suffit pas : quelqu'un qui
 * reste cassé à la hanche pendant toute la série a une oscillation faible,
 * donc un bon score de contrôle, alors que sa position est mauvaise du début
 * à la fin. C'est cette moyenne qui le voit.
 */
export function meanHipAngle(angles: PoseAngles[], reps: Rep[]): number {
  if (reps.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const rep of reps) {
    for (let i = rep.start; i <= rep.end && i < angles.length; i++) {
      sum += angles[i].hipAngle;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}
