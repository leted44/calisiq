import type { CriterionScore } from "./scoring";

export const PROGRESSION_LABELS: Record<string, string> = {
  tuck_planche: "Tuck planche",
  advanced_tuck_planche: "Advanced tuck planche",
  straddle_planche: "Straddle planche",
  full_planche: "Full planche",
  handstand: "Handstand",
};

// Critères effectivement recalibrés dans le code à partir de données
// réelles (calibration_samples, ou cas externes jugés comme Cali League) —
// à distinguer du nombre d'échantillons importés, qui ne veut pas dire
// que le code a déjà été mis à jour avec. Tenu à jour manuellement à
// chaque recalibration (voir aussi les commentaires dans grid.ts).
export const CALIBRATED_CRITERIA: Record<string, string[]> = {
  tuck_planche: [],
  advanced_tuck_planche: ["shoulder_protraction"],
  straddle_planche: [],
  full_planche: ["elbow_angle", "hip_angle", "body_line_angle"],
  handstand: ["hip_angle", "pelvis_deviation"],
  handstand_push_up: [],
  one_arm_handstand: [],
};

export type ScoreTier = "optimal" | "bon" | "faible";

export function tierFor(score: number): ScoreTier {
  if (score >= 8) return "optimal";
  if (score >= 6) return "bon";
  return "faible";
}

export const TIER_LABELS: Record<ScoreTier, string> = {
  optimal: "Optimal",
  bon: "Bon",
  faible: "À travailler",
};

export const TIER_COLORS: Record<ScoreTier, string> = {
  optimal: "text-green-400 border-green-500/40 bg-green-500/10",
  bon: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
  faible: "text-orange-400 border-orange-500/40 bg-orange-500/10",
};

const PLANCHE_DESCRIPTIONS: Record<string, Record<ScoreTier, string>> = {
  shoulder_protraction: {
    optimal: "Épaules bien avancées devant les poignets, la charge est correctement transférée sur les bras.",
    bon: "Protraction correcte, encore un peu de marge pour avancer les épaules.",
    faible: "Épaules pas assez avancées devant les poignets — charge insuffisante sur les bras, hold instable.",
  },
  pelvis_deviation: {
    optimal: "Bassin parfaitement aligné entre épaules et chevilles.",
    bon: "Bassin globalement aligné, léger écart par rapport à la ligne idéale.",
    faible: "Le bassin s'écarte nettement de la ligne épaule-hanche-cheville.",
  },
  hip_angle: {
    optimal: "Angle hanche-genou très proche de la cible pour cette variation.",
    bon: "Angle hanche-genou raisonnablement proche de la cible.",
    faible: "L'angle hanche-genou s'écarte de la cible attendue pour cette variation.",
  },
  elbow_angle: {
    optimal: "Bras bien tendus, verrouillage correct.",
    bon: "Bras presque tendus, léger fléchissement.",
    faible: "Coudes fléchis — la figure est compensée par les bras plutôt que par la position.",
  },
  knee_angle: {
    optimal: "Genoux bien tendus.",
    bon: "Genoux presque tendus, léger fléchissement.",
    faible: "Genoux fléchis — les jambes doivent rester tendues même en position tuck.",
  },
  body_line_angle: {
    optimal: "Corps bien parallèle au sol pour cette progression.",
    bon: "Corps globalement parallèle au sol, léger écart.",
    faible: "Le corps n'est pas assez parallèle au sol pour cette progression.",
  },
};

const HANDSTAND_DESCRIPTIONS: Record<string, Record<ScoreTier, string>> = {
  shoulder_flexion: {
    optimal: "Épaules bien ouvertes, bras overhead, oreilles cachées par les épaules.",
    bon: "Ouverture d'épaule correcte, encore un peu de marge pour pousser dans le sol.",
    faible: "Manque d'ouverture d'épaule — risque de cambrer le dos pour compenser.",
  },
  pelvis_deviation: {
    optimal: "Ligne de corps parfaitement droite, aucune arche.",
    bon: "Ligne de corps globalement droite, léger écart.",
    faible: "Le corps s'arque nettement (banana handstand) au lieu de rester droit.",
  },
  hip_angle: {
    optimal: "Hanche bien ouverte, corps aligné à la verticale.",
    bon: "Hanche raisonnablement ouverte, léger fléchissement.",
    faible: "Hanche repliée — attention au \"banana handstand\".",
  },
  elbow_angle: {
    optimal: "Bras bien tendus, verrouillage correct.",
    bon: "Bras presque tendus, léger fléchissement.",
    faible: "Coudes fléchis — la position est compensée par les bras plutôt que par l'équilibre.",
  },
  knee_angle: {
    optimal: "Genoux bien tendus, ligne verticale nette.",
    bon: "Genoux presque tendus, léger fléchissement.",
    faible: "Genoux fléchis — casse la ligne verticale du corps.",
  },
  body_line_angle: {
    optimal: "Corps bien vertical.",
    bon: "Corps globalement vertical, léger écart.",
    faible: "Le corps n'est pas assez vertical.",
  },
};

export function describeCriterion(
  critere: CriterionScore["critere"],
  score: number,
  figure: "planche" | "handstand"
): string {
  const map = figure === "handstand" ? HANDSTAND_DESCRIPTIONS : PLANCHE_DESCRIPTIONS;
  return map[critere]?.[tierFor(score)] ?? "";
}

export function figureFromProgression(progression: string): "planche" | "handstand" {
  return progression === "handstand" ? "handstand" : "planche";
}

export function formatHoldDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  return `${seconds.toFixed(1)}s`;
}
