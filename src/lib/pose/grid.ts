// Grille de scoring — DRAFT, confiance modérée (voir CLAUDE.md)
// Seuils issus de standards de coaching calisthénie, pas d'un dataset labellisé.
// shoulder_protraction et pelvis_deviation sont des ratios normalisés par la
// longueur du corps (indépendants de la distance/zoom caméra), pas des degrés.

export type Progression =
  | "tuck_planche"
  | "advanced_tuck_planche"
  | "straddle_planche"
  | "full_planche";

type Threshold = { target: number; tolerance: number };

export type ProgressionThresholds = {
  body_line_angle_from_horizontal: Threshold;
  elbow_angle: Threshold;
  hip_angle: Threshold;
  shoulder_protraction: Threshold;
  pelvis_deviation: Threshold;
};

export const SCORING_GRID: Record<Progression, ProgressionThresholds> = {
  tuck_planche: {
    body_line_angle_from_horizontal: { target: 25, tolerance: 10 },
    elbow_angle: { target: 175, tolerance: 10 },
    hip_angle: { target: 90, tolerance: 20 },
    shoulder_protraction: { target: 0.15, tolerance: 0.12 },
    pelvis_deviation: { target: 0, tolerance: 0.1 },
  },
  advanced_tuck_planche: {
    body_line_angle_from_horizontal: { target: 15, tolerance: 8 },
    elbow_angle: { target: 178, tolerance: 8 },
    hip_angle: { target: 110, tolerance: 15 },
    shoulder_protraction: { target: 0.2, tolerance: 0.12 },
    pelvis_deviation: { target: 0, tolerance: 0.08 },
  },
  straddle_planche: {
    body_line_angle_from_horizontal: { target: 8, tolerance: 6 },
    elbow_angle: { target: 180, tolerance: 6 },
    hip_angle: { target: 170, tolerance: 10 },
    shoulder_protraction: { target: 0.25, tolerance: 0.12 },
    pelvis_deviation: { target: 0, tolerance: 0.06 },
  },
  full_planche: {
    body_line_angle_from_horizontal: { target: 0, tolerance: 5 },
    elbow_angle: { target: 180, tolerance: 5 },
    hip_angle: { target: 180, tolerance: 8 },
    shoulder_protraction: { target: 0.3, tolerance: 0.12 },
    pelvis_deviation: { target: 0, tolerance: 0.05 },
  },
};
