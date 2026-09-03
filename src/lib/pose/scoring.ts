import type { PoseAngles } from "./angles";
import { hipSwing, tempoRegularity, type Rep } from "./repAnalysis";
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
export function scoreReps({
  angles,
  reps,
  thresholds,
}: {
  angles: PoseAngles[];
  reps: Rep[];
  thresholds: RepThresholds;
}): CriterionScore[] {
  if (reps.length === 0) return [];

  const driver = thresholds.driver;
  // Position tendue et position fléchie réellement atteintes, moyennées sur
  // la série : une seule bonne répétition ne doit pas masquer les autres.
  const meanAt = (pick: (rep: Rep) => number) =>
    reps.reduce((sum, rep) => sum + (angles[pick(rep)]?.[driver] ?? 0), 0) /
    reps.length;

  const flexedIsLow = thresholds.flexedValue < thresholds.extendedValue;
  const lockoutValue = meanAt((rep) => rep.extendedIndex);
  const peakValue = meanAt((rep) => rep.flexedIndex);

  const scores: CriterionScore[] = [
    {
      critere: "rep_lockout",
      // Sur un mouvement où la position tendue est l'angle haut (coude, genou),
      // le verrouillage est un minimum. Si l'orientation s'inversait, la
      // comparaison doit s'inverser avec elle.
      score: flexedIsLow
        ? scoreFromMinimum(lockoutValue, thresholds.lockout.target, thresholds.lockout.tolerance)
        : scoreFromMaximum(lockoutValue, thresholds.lockout.target, thresholds.lockout.tolerance),
      valeurMesuree: lockoutValue,
      valeurCible: thresholds.lockout.target,
    },
    {
      critere: "rep_peak",
      score: flexedIsLow
        ? scoreFromMaximum(peakValue, thresholds.peak.target, thresholds.peak.tolerance)
        : scoreFromMinimum(peakValue, thresholds.peak.target, thresholds.peak.tolerance),
      valeurMesuree: peakValue,
      valeurCible: thresholds.peak.target,
    },
  ];

  if (thresholds.hipSwing) {
    const swing = hipSwing(angles, reps);
    scores.push({
      critere: "rep_control",
      score: scoreFromMaximum(
        swing,
        thresholds.hipSwing.target,
        thresholds.hipSwing.tolerance
      ),
      valeurMesuree: swing,
      valeurCible: thresholds.hipSwing.target,
    });
  }

  // Exprimé en pourcentage pour rester lisible à côté d'angles en degrés.
  const regularity = tempoRegularity(reps) * 100;
  scores.push({
    critere: "rep_tempo",
    score: scoreFromMinimum(
      regularity,
      thresholds.tempo.target,
      thresholds.tempo.tolerance
    ),
    valeurMesuree: regularity,
    valeurCible: thresholds.tempo.target,
  });

  return scores;
}
