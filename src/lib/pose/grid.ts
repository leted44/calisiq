// Grille de scoring — DRAFT, confiance modérée (voir CLAUDE.md)
// shoulder_protraction et pelvis_deviation sont des ratios normalisés par la
// longueur du corps (indépendants de la distance/zoom caméra), pas des degrés.
// shoulder_protraction ne s'applique qu'à la planche (levier épaules/poignets,
// "seuil minimum" — plus de protraction n'est jamais un défaut). Pour le
// handstand, remplacé par shoulder_flexion (angle hanche-épaule-poignet,
// ouverture d'épaule) : plus pertinent pour une figure overhead, et
// shoulder_protraction n'avait justement montré aucun signal exploitable
// dans les échantillons réels (calibration_samples).
//
// Planche : seuils issus de standards de coaching, recalibrés le 2026-08 à
// partir de 2 cas réels jugés 10/10 par Cali League (mesurés chez nous à
// 0.66 et 0.80 pour advanced_tuck_planche).
//
// Handstand : hip_angle et pelvis_deviation calibrés le 2026-08 à partir de
// 8 échantillons réels notés par l'utilisateur (calibration_samples).
// elbow_angle, knee_angle et shoulder_flexion : cibles fixées par
// raisonnement biomécanique (~180°, alignement/verrouillage), à affiner si
// des échantillons plus ciblés deviennent disponibles.
//
// knee_angle (genoux tendus, hanche-genou-cheville) : critère ajouté le
// 2026-08, mais retiré de Tuck et Advanced Tuck le 2026-08-25 — dans ces
// deux variations, les genoux fléchis font partie de la technique correcte
// (le "tuck" vient de la flexion hanche ET genou pour ramener le corps en
// boule), ce n'est qu'à partir du Straddle/Full que les jambes doivent être
// tendues. Le noter à 180° partout pénalisait une position pourtant juste.
//
// body_line_angle_from_horizontal (axe global du corps) : critère ajouté
// le 2026-08, cible raisonnée (pas encore de données réelles isolées).

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
  knee_angle?: Threshold;
  shoulder_protraction?: ShoulderProtractionThreshold;
  shoulder_flexion?: Threshold;
  pelvis_deviation: Threshold;
};

export const SCORING_GRID: Record<Progression, ProgressionThresholds> = {
  tuck_planche: {
    body_line_angle_from_horizontal: { target: 25, tolerance: 10 },
    elbow_angle: { target: 175, tolerance: 10 },
    hip_angle: { target: 90, tolerance: 20 },
    shoulder_protraction: { target: 0.35, tolerance: 0.2, mode: "minimum" },
    pelvis_deviation: { target: 0, tolerance: 0.25 },
  },
  advanced_tuck_planche: {
    body_line_angle_from_horizontal: { target: 15, tolerance: 8 },
    elbow_angle: { target: 178, tolerance: 8 },
    hip_angle: { target: 110, tolerance: 15 },
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
    shoulder_flexion: { target: 180, tolerance: 20 },
    pelvis_deviation: { target: 0, tolerance: 0.12 },
  },
};
