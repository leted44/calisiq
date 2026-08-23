import type { PoseAngles } from "./angles";
import { SCORING_GRID, type Progression } from "./grid";

export type CriterionScore = {
  critere: "body_line" | "elbow_angle" | "hip_angle";
  score: number;
  valeurMesuree: number;
  valeurCible: number;
};

// Score linéaire : 10 si pile sur la cible, 0 dès que l'écart atteint la tolérance
function scoreFromThreshold(
  measured: number,
  target: number,
  tolerance: number
): number {
  const diff = Math.abs(measured - target);
  const score = 10 * (1 - diff / tolerance);
  return Math.max(0, Math.min(10, score));
}

export function scoreAngles(
  angles: PoseAngles,
  progression: Progression
): CriterionScore[] {
  const grid = SCORING_GRID[progression];

  return [
    {
      critere: "body_line",
      score: scoreFromThreshold(
        angles.bodyLineAngleFromHorizontal,
        grid.body_line_angle_from_horizontal.target,
        grid.body_line_angle_from_horizontal.tolerance
      ),
      valeurMesuree: angles.bodyLineAngleFromHorizontal,
      valeurCible: grid.body_line_angle_from_horizontal.target,
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
      critere: "hip_angle",
      score: scoreFromThreshold(
        angles.hipAngle,
        grid.hip_angle.target,
        grid.hip_angle.tolerance
      ),
      valeurMesuree: angles.hipAngle,
      valeurCible: grid.hip_angle.target,
    },
  ];
}

export function globalScore(scores: CriterionScore[]): number {
  return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
}
