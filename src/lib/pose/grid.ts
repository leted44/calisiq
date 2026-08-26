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
// body_line_angle_from_horizontal (axe global du corps, épaule -> cheville) :
// critère ajouté le 2026-08. Retiré de Tuck et Advanced Tuck le 2026-08-25,
// même raison que knee_angle : chevilles repliées près du buste en tuck,
// la ligne épaule-cheville n'a pas de sens tant que les jambes ne sont pas
// tendues (Straddle/Full/Handstand). Recalculé sur épaule->cheville plutôt
// qu'épaule->hanche : base plus longue, moins bruitée.
//
// Full Planche : elbow_angle, hip_angle et body_line_angle_from_horizontal
// recalibrés le 2026-08-26 à partir de 8 échantillons réels notés par
// l'utilisateur (calibration_samples), après correction d'un bug sur
// body_line_angle_from_horizontal (voir angles.ts — l'angle dépendait du
// sens de la caméra). Confirmé par 2 échantillons de contraste ajoutés
// ensuite (9.5/10 et 2.5/10, ce dernier étant en réalité une Tuck Planche
// mal étiquetée) : les deux se placent correctement aux deux bouts de
// l'échelle avec la grille actuelle, sans ajustement supplémentaire.
//
// Tuck Planche et Advanced Tuck Planche recalibrés le 2026-08-26 à partir
// de 5 et 11 échantillons réels :
// - hip_angle (Tuck) : cible corrigée de 90° à 47° — les 2 échantillons
//   jugés 9.5/10 mesuraient tous deux ~46-47°, très loin de la cible
//   d'origine (jamais validée sur données réelles).
// - hip_angle (Advanced Tuck) : cible 110° confirmée, mais tolérance
//   élargie (15 -> 30) — la "bonne zone" couvre en réalité ~90-130°.
// - elbow_angle : ne montre pas de signal isolable dans ces deux
//   variations (mêmes valeurs d'élite y compris sur des échantillons mal
//   notés pour d'autres raisons) — tolérance élargie par cohérence avec
//   Handstand/Full Planche plutôt que resserrée sur du bruit.
// - pelvis_deviation retiré des deux : mesure la déviation par rapport à
//   la ligne épaule-cheville, qui n'a pas de sens jambes repliées (même
//   raison que knee_angle/body_line_angle déjà retirés) — confirmé cette
//   fois par les données : les échantillons les mieux notés montrent une
//   déviation élevée (jambes tendues vers l'arrière = "déviation" par
//   rapport à une ligne droite, ce qui est normal et attendu en tuck).

export type Progression =
  | "tuck_planche"
  | "advanced_tuck_planche"
  | "straddle_planche"
  | "full_planche"
  | "handstand";

type Threshold = { target: number; tolerance: number };
type ShoulderProtractionThreshold = Threshold & { mode: "minimum" | "band" };

export type ProgressionThresholds = {
  body_line_angle_from_horizontal?: Threshold;
  elbow_angle: Threshold;
  hip_angle: Threshold;
  knee_angle?: Threshold;
  shoulder_protraction?: ShoulderProtractionThreshold;
  shoulder_flexion?: Threshold;
  pelvis_deviation?: Threshold;
};

export const SCORING_GRID: Record<Progression, ProgressionThresholds> = {
  tuck_planche: {
    elbow_angle: { target: 176, tolerance: 20 },
    hip_angle: { target: 47, tolerance: 85 },
    shoulder_protraction: { target: 0.35, tolerance: 0.2, mode: "minimum" },
  },
  advanced_tuck_planche: {
    elbow_angle: { target: 176, tolerance: 20 },
    hip_angle: { target: 110, tolerance: 30 },
    shoulder_protraction: { target: 0.5, tolerance: 0.2, mode: "minimum" },
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
    body_line_angle_from_horizontal: { target: 0, tolerance: 12 },
    elbow_angle: { target: 180, tolerance: 22 },
    hip_angle: { target: 170, tolerance: 22 },
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
