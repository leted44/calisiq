import type { PoseAngles } from "./angles";
import { hipSwing, meanHipAngle, tempoRegularity, type Rep } from "./repAnalysis";
import { SCORING_GRID, type Progression, type RepThresholds } from "./grid";

export type CriterionScore = {
  critere:
    | "shoulder_protraction"
    | "shoulder_flexion"
    | "pelvis_deviation"
    | "hip_angle"
    | "knee_angle"
    | "elbow_angle"
    | "body_line_angle"
    | "torso_angle"
    | "straightest_knee_angle"
    | "straightest_leg_hip_angle"
    | "bent_knee_angle"
    // Critères propres aux exercices à répétition. Ils sortent du même type
    // que les critères de hold, volontairement : tout l'aval — affichage,
    // recommandations, export vidéo — fonctionne alors sans modification.
    | "rep_lockout"
    | "rep_peak"
    | "rep_control"
    | "rep_form"
    | "rep_tempo";
  score: number;
  valeurMesuree: number;
  valeurCible: number;
};

// Décroissance progressive : 10 pile sur la cible, 5 à l'écart de la tolérance,
// tend vers 0 sans jamais y couper net (contrairement à un simple clamp linéaire)
function scoreFromThreshold(
  measured: number,
  target: number,
  tolerance: number
): number {
  const diff = Math.abs(measured - target);
  const ratio = diff / tolerance;
  return 10 / (1 + ratio * ratio);
}

// Critère "seuil maximum" : score plein tant que la mesure reste sous le
// seuil, décroissance linéaire au-delà (utilisé pour la jambe qui doit
// rester repliée : la replier plus n'est jamais un défaut)
// Note un critère d'inclinaison, qui peut être une bande ou un seuil maximum
// selon la figure. Voir TiltThreshold dans grid.ts : sur un front lever on
// vise l'horizontale et s'en écarter des deux côtés est une faute, sur un
// dragon flag descendre plus bas n'en est jamais une.
function scoreTilt(
  measured: number,
  threshold: { target: number; tolerance: number; mode?: "maximum" }
): number {
  return threshold.mode === "maximum"
    ? scoreFromMaximum(measured, threshold.target, threshold.tolerance)
    : scoreFromThreshold(measured, threshold.target, threshold.tolerance);
}

function scoreFromMaximum(
  measured: number,
  maximum: number,
  ramp: number
): number {
  if (measured <= maximum) return 10;
  const excess = measured - maximum;
  return Math.max(0, 10 * (1 - excess / ramp));
}

// Critère "seuil minimum" : score plein dès que la mesure atteint le seuil,
// pas de pénalité au-delà (utilisé pour la protraction : plus n'est jamais pire)
function scoreFromMinimum(
  measured: number,
  minimum: number,
  ramp: number
): number {
  if (measured >= minimum) return 10;
  const deficit = minimum - measured;
  return Math.max(0, 10 * (1 - deficit / ramp));
}

export function scoreAngles(
  angles: PoseAngles,
  progression: Progression
): CriterionScore[] {
  const grid = SCORING_GRID[progression];

  const scores: CriterionScore[] = [];

  if (grid.shoulder_protraction) {
    const t = grid.shoulder_protraction;
    scores.push({
      critere: "shoulder_protraction",
      score:
        t.mode === "band"
          ? scoreFromThreshold(angles.shoulderProtraction, t.target, t.tolerance)
          : scoreFromMinimum(angles.shoulderProtraction, t.target, t.tolerance),
      valeurMesuree: angles.shoulderProtraction,
      valeurCible: t.target,
    });
  }

  if (grid.shoulder_flexion) {
    scores.push({
      critere: "shoulder_flexion",
      score: scoreFromThreshold(
        angles.shoulderFlexionAngle,
        grid.shoulder_flexion.target,
        grid.shoulder_flexion.tolerance
      ),
      valeurMesuree: angles.shoulderFlexionAngle,
      valeurCible: grid.shoulder_flexion.target,
    });
  }

  if (grid.knee_angle) {
    scores.push({
      critere: "knee_angle",
      score: scoreFromThreshold(
        angles.kneeAngle,
        grid.knee_angle.target,
        grid.knee_angle.tolerance
      ),
      valeurMesuree: angles.kneeAngle,
      valeurCible: grid.knee_angle.target,
    });
  }

  if (grid.pelvis_deviation) {
    scores.push({
      critere: "pelvis_deviation",
      score: scoreFromThreshold(
        angles.pelvisDeviation,
        grid.pelvis_deviation.target,
        grid.pelvis_deviation.tolerance
      ),
      valeurMesuree: angles.pelvisDeviation,
      valeurCible: grid.pelvis_deviation.target,
    });
  }

  if (grid.hip_angle) {
    scores.push({
      critere: "hip_angle",
      score: scoreFromThreshold(
        angles.hipAngle,
        grid.hip_angle.target,
        grid.hip_angle.tolerance
      ),
      valeurMesuree: angles.hipAngle,
      valeurCible: grid.hip_angle.target,
    });
  }

  if (grid.elbow_angle) {
    scores.push({
      critere: "elbow_angle",
      score: scoreFromThreshold(
        angles.elbowAngle,
        grid.elbow_angle.target,
        grid.elbow_angle.tolerance
      ),
      valeurMesuree: angles.elbowAngle,
      valeurCible: grid.elbow_angle.target,
    });
  }

  if (grid.torso_angle) {
    scores.push({
      critere: "torso_angle",
      score: scoreTilt(angles.torsoAngleFromHorizontal, grid.torso_angle),
      valeurMesuree: angles.torsoAngleFromHorizontal,
      valeurCible: grid.torso_angle.target,
    });
  }

  if (grid.straightest_knee_angle) {
    scores.push({
      critere: "straightest_knee_angle",
      score: scoreFromThreshold(
        angles.straightestKneeAngle,
        grid.straightest_knee_angle.target,
        grid.straightest_knee_angle.tolerance
      ),
      valeurMesuree: angles.straightestKneeAngle,
      valeurCible: grid.straightest_knee_angle.target,
    });
  }

  if (grid.bent_knee_angle) {
    scores.push({
      critere: "bent_knee_angle",
      score: scoreFromMaximum(
        angles.bentKneeAngle,
        grid.bent_knee_angle.target,
        grid.bent_knee_angle.tolerance
      ),
      valeurMesuree: angles.bentKneeAngle,
      valeurCible: grid.bent_knee_angle.target,
    });
  }

  if (grid.straightest_leg_hip_angle) {
    scores.push({
      critere: "straightest_leg_hip_angle",
      score: scoreFromThreshold(
        angles.straightestLegHipAngle,
        grid.straightest_leg_hip_angle.target,
        grid.straightest_leg_hip_angle.tolerance
      ),
      valeurMesuree: angles.straightestLegHipAngle,
      valeurCible: grid.straightest_leg_hip_angle.target,
    });
  }

  if (grid.body_line_angle_from_horizontal) {
    scores.push({
      critere: "body_line_angle",
      score: scoreTilt(
        angles.bodyLineAngleFromHorizontal,
        grid.body_line_angle_from_horizontal
      ),
      valeurMesuree: angles.bodyLineAngleFromHorizontal,
      valeurCible: grid.body_line_angle_from_horizontal.target,
    });
  }

  return scores;
}

export function globalScore(scores: CriterionScore[]): number {
  return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
}

// En dessous de la moitié du barème, un critère ne décrit plus une
// imperfection mais une faute.
const MAJOR_FAULT_THRESHOLD = 5;
// Écart maximal toléré entre la note globale et le critère fautif.
const MAJOR_FAULT_MARGIN = 2;

/**
 * Note globale avec plafonnement sur faute majeure.
 *
 * POURQUOI LA MOYENNE NE SUFFIT PAS
 *
 * Mesuré sur un vrai échantillon : une série de handstand push-up exécutée
 * corps plié en deux, notée 2/10 à l'œil, ressortait à 8,1/10. Ses critères
 * pris un par un étaient pourtant justes — la forme sortait à 0,5 quand
 * l'humain mettait 1,5, la profondeur à 10 quand il mettait 9,5. C'est
 * l'agrégation qui était fausse : quatre critères à 10 noyaient le seul qui
 * voyait la faute.
 *
 * Une moyenne suppose des critères interchangeables, où un excédent ici
 * compense un manque là. La technique ne marche pas comme ça : une figure
 * dont le corps est cassé est ratée, quelle que soit la qualité du reste.
 * C'est d'ailleurs le principe des déductions en gymnastique.
 *
 * D'où la règle : tant qu'aucun critère ne descend sous la moitié, la
 * moyenne s'applique telle quelle et rien ne change. Dès qu'un critère
 * bascule dans la faute, il tire la note globale à lui.
 *
 * Vérifié sur 7 échantillons notés à la main, écart absolu moyen entre la
 * grille et l'œil : 1,23 avec la moyenne seule, 0,46 avec ce plafond, et le
 * pire écart passe de 6,09 à 0,82.
 *
 * RÉSERVÉ AUX EXERCICES À RÉPÉTITION pour l'instant. Le défaut est le même
 * sur les figures statiques, mais leurs seuils ont été calibrés sous la
 * moyenne simple : les basculer sans refaire ce travail déplacerait toutes
 * leurs notes d'un coup.
 */
export function globalScoreWithMajorFault(scores: CriterionScore[]): number {
  const mean = globalScore(scores);
  if (scores.length === 0) return mean;
  const weakest = Math.min(...scores.map((s) => s.score));
  if (weakest >= MAJOR_FAULT_THRESHOLD) return mean;
  return Math.min(mean, weakest + MAJOR_FAULT_MARGIN);
}

// ---------------------------------------------------------------------------
// Notation des exercices à répétition
// ---------------------------------------------------------------------------
//
// Quatre critères, les mêmes pour tous les mouvements ; seuls les seuils
// changent d'un exercice à l'autre. Les modes de notation sont structurels et
// non configurables, parce qu'ils découlent de la nature de chaque critère :
//
//   lockout  minimum — on ne peut pas dépasser l'extension complète,
//                      s'arrêter avant est la faute.
//   peak     maximum — descendre plus bas que demandé n'est jamais une faute.
//   control  maximum — l'oscillation de hanche mesure l'élan, moins il y en a
//                      mieux c'est, et zéro est parfait.
//   tempo    minimum — au-delà d'une certaine régularité, plus régulier
//                      n'apporte rien.
/**
 * Mesures brutes d'une série, telles que le moteur les calcule.
 *
 * Extraites en type à part pour que la notation soit rejouable depuis des
 * valeurs déjà enregistrées : la page de calibration en a besoin pour
 * comparer la note de la grille aux notes humaines sans réanalyser la vidéo.
 */
export type RepMeasures = {
  lockout: number;
  peak: number;
  hipSwing: number | null;
  form: number | null;
  // Null quand la série est trop courte pour que la régularité veuille dire
  // quelque chose. Le critère est alors ÉCARTÉ de la moyenne, et non noté 10 :
  // sur une seule répétition il n'y a rien à comparer, et créditer un 10
  // offrait un cinquième de la note globale sans la moindre preuve.
  tempo: number | null;
};

/**
 * Note un jeu de mesures de série.
 *
 * Les modes sont structurels et non configurables, parce qu'ils découlent de
 * la nature de chaque critère :
 *
 *   lockout  minimum — on ne peut pas dépasser l'extension complète,
 *                      s'arrêter avant est la faute.
 *   peak     maximum — descendre plus bas que demandé n'est jamais une faute.
 *   control  maximum — l'oscillation de hanche mesure l'élan, zéro est parfait.
 *   form     bande   — la tenue du corps s'écarte de sa cible dans les deux sens.
 *   tempo    minimum — au-delà d'une certaine régularité, plus régulier
 *                      n'apporte rien.
 */
export function scoreRepMeasures(
  measures: RepMeasures,
  thresholds: RepThresholds
): CriterionScore[] {
  const flexedIsLow = thresholds.flexedValue < thresholds.extendedValue;

  const scores: CriterionScore[] = [
    {
      critere: "rep_lockout",
      // Sur un mouvement où la position tendue est l'angle haut (coude,
      // genou), le verrouillage est un minimum. Si l'orientation s'inversait,
      // la comparaison doit s'inverser avec elle.
      score: flexedIsLow
        ? scoreFromMinimum(measures.lockout, thresholds.lockout.target, thresholds.lockout.tolerance)
        : scoreFromMaximum(measures.lockout, thresholds.lockout.target, thresholds.lockout.tolerance),
      valeurMesuree: measures.lockout,
      valeurCible: thresholds.lockout.target,
    },
    {
      critere: "rep_peak",
      score: flexedIsLow
        ? scoreFromMaximum(measures.peak, thresholds.peak.target, thresholds.peak.tolerance)
        : scoreFromMinimum(measures.peak, thresholds.peak.target, thresholds.peak.tolerance),
      valeurMesuree: measures.peak,
      valeurCible: thresholds.peak.target,
    },
  ];

  if (thresholds.hipSwing && measures.hipSwing !== null) {
    scores.push({
      critere: "rep_control",
      score: scoreFromMaximum(
        measures.hipSwing,
        thresholds.hipSwing.target,
        thresholds.hipSwing.tolerance
      ),
      valeurMesuree: measures.hipSwing,
      valeurCible: thresholds.hipSwing.target,
    });
  }

  if (thresholds.form && measures.form !== null) {
    // Tenue du corps pendant le mouvement, à distinguer du contrôle : le
    // contrôle voit l'élan (les variations), la forme voit la posture (la
    // moyenne). Une série entièrement cassée à la hanche a une oscillation
    // faible et passerait donc pour maîtrisée sans ce critère.
    scores.push({
      critere: "rep_form",
      score: scoreFromThreshold(
        measures.form,
        thresholds.form.target,
        thresholds.form.tolerance
      ),
      valeurMesuree: measures.form,
      valeurCible: thresholds.form.target,
    });
  }

  if (measures.tempo !== null) {
    scores.push({
      critere: "rep_tempo",
      score: scoreFromMinimum(
        measures.tempo,
        thresholds.tempo.target,
        thresholds.tempo.tolerance
      ),
      valeurMesuree: measures.tempo,
      valeurCible: thresholds.tempo.target,
    });
  }

  return scores;
}

// Calcule les mesures d'une série puis les note. La séparation entre les deux
// permet de rejouer la notation sur des mesures déjà enregistrées.
export function scoreReps({
  angles,
  reps,
  frameTimes,
  thresholds,
}: {
  angles: PoseAngles[];
  reps: Rep[];
  /** Instant réel de chaque image, en secondes. Voir tempoRegularity. */
  frameTimes: number[];
  thresholds: RepThresholds;
}): CriterionScore[] {
  if (reps.length === 0) return [];

  const driver = thresholds.driver;
  // Position tendue et position fléchie réellement atteintes, moyennées sur
  // la série : une seule bonne répétition ne doit pas masquer les autres.
  const meanAt = (pick: (rep: Rep) => number) =>
    reps.reduce((sum, rep) => sum + (angles[pick(rep)]?.[driver] ?? 0), 0) /
    reps.length;

  return scoreRepMeasures(
    {
      lockout: meanAt((rep) => rep.extendedIndex),
      peak: meanAt((rep) => rep.flexedIndex),
      hipSwing: thresholds.hipSwing ? hipSwing(angles, reps) : null,
      form: thresholds.form ? meanHipAngle(angles, reps) : null,
      // Exprimé en pourcentage pour rester lisible à côté d'angles en degrés.
      // Sous trois répétitions, l'écart type des durées porte sur un ou deux
      // écarts : le chiffre existe mais ne décrit rien.
      tempo: reps.length >= 3 ? tempoRegularity(reps, frameTimes) * 100 : null,
    },
    thresholds
  );
}
