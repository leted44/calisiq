import type { CriterionScore } from "./scoring";

export type Recommendation = { exercice: string; raison: string };

const EXERCISE_MAP: Record<string, Recommendation[]> = {
  shoulder_protraction: [
    {
      exercice: "Planche lean (lean progressif contre un mur ou au sol)",
      raison:
        "Épaules pas assez avancées devant les poignets = charge insuffisante sur les avant-bras, hold instable.",
    },
    {
      exercice: "Pseudo planche push-up",
      raison:
        "Renforce spécifiquement la protraction d'épaule nécessaire au maintien de la planche.",
    },
    {
      exercice: "Scapula push-up",
      raison: "Travaille le contrôle scapulaire indispensable à une bonne protraction.",
    },
  ],
  pelvis_deviation_sag: [
    {
      exercice: "Hollow body hold",
      raison:
        "Les hanches tombent (sag) au lieu de rester alignées épaule-hanche-cheville.",
    },
    {
      exercice: "Tuck planche isométrique avec cue verbal « nombril vers colonne »",
      raison: "Renforce le gainage nécessaire pour éviter le sag du bassin.",
    },
  ],
  pelvis_deviation_pike: [
    {
      exercice: "Straddle planche avec cue « pousser les talons vers l'arrière »",
      raison:
        "Les hanches remontent (pike) au lieu de rester alignées épaule-hanche-cheville.",
    },
  ],
  hip_angle: [
    {
      exercice: "Tuck hold isométrique (paumes au sol)",
      raison:
        "Renforce le contrôle de l'angle hanche-genou spécifique à ta progression actuelle.",
    },
    {
      exercice: "L-sit progressif",
      raison:
        "Développe la force des fléchisseurs de hanche nécessaire pour tenir l'angle cible.",
    },
  ],
  elbow_angle: [
    {
      exercice: "Renforcement triceps isolé (push-up diamant, dips)",
      raison:
        "Coudes fléchis pour compenser un manque de force, ce qui invalide la figure à haut niveau.",
    },
    {
      exercice: "Réduire la durée du hold, prioriser la forme sur le temps",
      raison:
        "Mieux vaut un hold court avec les bras tendus qu'un hold long en compensant avec les coudes.",
    },
  ],
};

export function pickWeakestCriterion(scores: CriterionScore[]): CriterionScore {
  return scores.reduce((worst, s) => (s.score < worst.score ? s : worst));
}

export function recommendationsFor(
  critere: CriterionScore["critere"],
  pelvisSagSign: number
): Recommendation[] {
  if (critere === "pelvis_deviation") {
    return pelvisSagSign >= 0
      ? EXERCISE_MAP.pelvis_deviation_sag
      : EXERCISE_MAP.pelvis_deviation_pike;
  }
  return EXERCISE_MAP[critere] ?? [];
}
