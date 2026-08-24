import type { PoseAngles } from "./angles";
import { SCORING_GRID, type Progression } from "./grid";

export type CriterionScore = {
  critere:
    | "shoulder_protraction"
    | "shoulder_flexion"
    | "pelvis_deviation"
    | "hip_angle"
    | "knee_angle"
    | "elbow_angle"
    | "body_line_angle";
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

  scores.push(
    {
      critere: "pelvis_deviation",
      score: scoreFromThreshold(
        angles.pelvisDeviation,
        grid.pelvis_deviation.target,
        grid.pelvis_deviation.tolerance
      ),
      valeurMesuree: angles.pelvisDeviation,
      valeurCible: grid.pelvis_deviation.target,
    },
    {
      critere: "hip_angle",
      score: scoreFromThreshold(
        angles.hipAngle,
        grid.hip_angle.target,
        grid.hip_angle.tolerance
      ),
      valeurMesuree: angles.hipAngle,
      valeurCible: grid.hip_angle.target,
    },
    {
      critere: "elbow_angle",
      score: scoreFromThreshold(
        angles.elbowAngle,
        grid.elbow_angle.target,
        grid.elbow_angle.tolerance
      ),
      valeurMesuree: angles.elbowAngle,
      valeurCible: grid.elbow_angle.target,
    },
    {
      critere: "body_line_angle",
      score: scoreFromThreshold(
        angles.bodyLineAngleFromHorizontal,
        grid.body_line_angle_from_horizontal.target,
        grid.body_line_angle_from_horizontal.tolerance
      ),
      valeurMesuree: angles.bodyLineAngleFromHorizontal,
      valeurCible: grid.body_line_angle_from_horizontal.target,
    }
  );

  return scores;
}

export function globalScore(scores: CriterionScore[]): number {
  return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
}
