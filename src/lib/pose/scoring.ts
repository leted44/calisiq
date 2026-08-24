import type { PoseAngles } from "./angles";
import { SCORING_GRID, type Progression } from "./grid";

export type CriterionScore = {
  critere:
    | "shoulder_protraction"
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

  return [
    {
      critere: "shoulder_protraction",
      score:
        grid.shoulder_protraction.mode === "band"
          ? scoreFromThreshold(
              angles.shoulderProtraction,
              grid.shoulder_protraction.target,
              grid.shoulder_protraction.tolerance
            )
          : scoreFromMinimum(
              angles.shoulderProtraction,
              grid.shoulder_protraction.target,
              grid.shoulder_protraction.tolerance
            ),
      valeurMesuree: angles.shoulderProtraction,
      valeurCible: grid.shoulder_protraction.target,
    },
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
      critere: "knee_angle",
      score: scoreFromThreshold(
        angles.kneeAngle,
        grid.knee_angle.target,
        grid.knee_angle.tolerance
      ),
      valeurMesuree: angles.kneeAngle,
      valeurCible: grid.knee_angle.target,
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
    },
  ];
}

export function globalScore(scores: CriterionScore[]): number {
  return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
}
