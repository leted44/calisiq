// Grille de scoring — DRAFT, confiance modérée (voir CLAUDE.md)
// shoulder_protraction et pelvis_deviation sont des ratios normalisés par la
// longueur du corps (indépendants de la distance/zoom caméra), pas des degrés.
//
// shoulder_protraction a deux modes :
// - "minimum" (planche) : target = seuil à atteindre, pas de pénalité pour un
//   dépassement (plus de protraction n'est jamais un défaut en planche).
// - "band" (handstand) : target = valeur idéale, pénalité dans les deux sens
//   (épaules doivent être alignées au-dessus des poignets, ni devant ni derrière).
//
// Planche : seuils issus de standards de coaching, recalibrés le 2026-08 à
// partir de 2 cas réels jugés 10/10 par Cali League (mesurés chez nous à
// 0.66 et 0.80 pour advanced_tuck_planche).
//
// Handstand : hip_angle et pelvis_deviation calibrés le 2026-08 à partir de
// 8 échantillons réels notés par l'utilisateur (calibration_samples).
// elbow_angle et shoulder_protraction n'avaient pas de signal isolable dans
// ces échantillons (dominés par le critère hanche/bassin) — cibles fixées
// par raisonnement biomécanique (bras tendus ~180°, épaules alignées),
// à affiner si des échantillons plus ciblés deviennent disponibles.
//
// knee_angle (genoux tendus, hanche-genou-cheville) et
// body_line_angle_from_horizontal (axe global du corps) : critères ajoutés
// le 2026-08, cibles raisonnées (pas encore de données réelles isolées).

export type Progression =
  | "tuck_planche"
  | "advanced_tuck_planche"
  | "straddle_planche"
  | "full_planche"
  | "handstand";

type Threshold = { target: number; tolerance: number };
type ShoulderProtractionThreshold = Threshold & { mode: "minimum" | "band" };

export type ProgressionThresholds = {
  body_line_angle_from_horizontal: Threshold;
  elbow_angle: Threshold;
  hip_angle: Threshold;
  knee_angle: Threshold;
  shoulder_protraction: ShoulderProtractionThreshold;
  pelvis_deviation: Threshold;
};

export const SCORING_GRID: Record<Progression, ProgressionThresholds> = {
  tuck_planche: {
    body_line_angle_from_horizontal: { target: 25, tolerance: 10 },
    elbow_angle: { target: 175, tolerance: 10 },
    hip_angle: { target: 90, tolerance: 20 },
    knee_angle: { target: 180, tolerance: 20 },
    shoulder_protraction: { target: 0.35, tolerance: 0.2, mode: "minimum" },
    pelvis_deviation: { target: 0, tolerance: 0.25 },
  },
  advanced_tuck_planche: {
    body_line_angle_from_horizontal: { target: 15, tolerance: 8 },
    elbow_angle: { target: 178, tolerance: 8 },
    hip_angle: { target: 110, tolerance: 15 },
    knee_angle: { target: 180, tolerance: 15 },
    shoulder_protraction: { target: 0.5, tolerance: 0.2, mode: "minimum" },
    pelvis_deviation: { target: 0, tolerance: 0.25 },
  },
  straddle_planche: {
    body_line_angle_from_horizontal: { target: 8, tolerance: 6 },
    elbow_angle: { target: 180, tolerance: 6 },
    hip_angle: { target: 170, tolerance: 10 },
    knee_angle: { target: 180, tolerance: 10 },
    shoulder_protraction: { target: 0.6, tolerance: 0.2, mode: "minimum" },
    pelvis_deviation: { target: 0, tolerance: 0.18 },
  },
  full_planche: {
    body_line_angle_from_horizontal: { target: 0, tolerance: 5 },
    elbow_angle: { target: 180, tolerance: 5 },
    hip_angle: { target: 180, tolerance: 8 },
    knee_angle: { target: 180, tolerance: 8 },
    shoulder_protraction: { target: 0.7, tolerance: 0.2, mode: "minimum" },
    pelvis_deviation: { target: 0, tolerance: 0.12 },
  },
  handstand: {
    body_line_angle_from_horizontal: { target: 90, tolerance: 15 },
    elbow_angle: { target: 178, tolerance: 22 },
    hip_angle: { target: 172, tolerance: 18 },
    knee_angle: { target: 180, tolerance: 20 },
    shoulder_protraction: { target: 0, tolerance: 0.18, mode: "band" },
    pelvis_deviation: { target: 0, tolerance: 0.12 },
  },
};
