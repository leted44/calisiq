import type { CriterionScore } from "./scoring";
import type { Progression } from "./grid";

export type Recommendation = { exercice: string; raison: string };

const PLANCHE_EXERCISE_MAP: Record<string, Recommendation[]> = {
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
  knee_angle: [
    {
      exercice: "Étirements ischio-jambiers + gainage jambes tendues",
      raison:
        "Genoux fléchis — les jambes doivent rester tendues même en position tuck, sinon la figure suivante (straddle, full) sera plus dure à transférer.",
    },
    {
      exercice: "Straddle-L progressif, jambes verrouillées",
      raison: "Renforce l'habitude de garder les genoux tendus sous tension.",
    },
  ],
  body_line_angle: [
    {
      exercice: "Hold isométrique dans la position cible avec cue « pousser vers le sol »",
      raison:
        "Le corps n'est pas assez parallèle au sol pour cette progression — souvent un manque de force d'épaules plus que de technique.",
    },
  ],
};

const HANDSTAND_EXERCISE_MAP: Record<string, Recommendation[]> = {
  shoulder_protraction: [
    {
      exercice: "Handstand dos au mur (chest-to-wall)",
      raison:
        "Épaules pas alignées au-dessus des poignets — ce hold apprend à empiler poignet-épaule-hanche à la verticale.",
    },
    {
      exercice: "Pike push-up",
      raison: "Renforce les épaules dans l'amplitude overhead nécessaire à l'alignement.",
    },
  ],
  pelvis_deviation_sag: [
    {
      exercice: "Hollow body hold",
      raison:
        "Le bassin part en arche (banana handstand) au lieu de rester aligné épaule-hanche-cheville.",
    },
    {
      exercice: "Handstand dos au mur avec cue « fessiers serrés, nombril rentré »",
      raison: "Renforce le gainage nécessaire pour garder une ligne droite en l'air.",
    },
  ],
  pelvis_deviation_pike: [
    {
      exercice: "Handstand face au mur avec cue « pousser le sol, hanches ouvertes »",
      raison:
        "Le bassin est trop replié vers l'avant au lieu de rester aligné épaule-hanche-cheville.",
    },
  ],
  hip_angle: [
    {
      exercice: "Hollow body hold",
      raison: "Renforce le gainage qui maintient la ligne hanche-genou droite en équilibre.",
    },
    {
      exercice: "Handstand dos au mur, dos plat contre le mur",
      raison: "Donne un repère physique pour sentir une ligne de corps réellement droite.",
    },
  ],
  elbow_angle: [
    {
      exercice: "Handstand push-up négatif contre un mur",
      raison:
        "Coudes fléchis pour compenser un manque de force d'épaules, ce qui invalide la figure à haut niveau.",
    },
    {
      exercice: "Réduire la durée du hold, prioriser bras tendus sur le temps",
      raison:
        "Mieux vaut un hold court avec les bras verrouillés qu'un hold long en compensant avec les coudes.",
    },
  ],
  knee_angle: [
    {
      exercice: "Handstand dos au mur, jambes actives et tendues",
      raison: "Genoux fléchis — casse la ligne verticale du corps et complique l'équilibre.",
    },
  ],
  body_line_angle: [
    {
      exercice: "Handstand dos au mur pour sentir la ligne verticale",
      raison: "Le corps n'est pas assez vertical — repère physique utile pour corriger l'axe global.",
    },
  ],
};

export function pickWeakestCriterion(scores: CriterionScore[]): CriterionScore {
  return scores.reduce((worst, s) => (s.score < worst.score ? s : worst));
}

export function recommendationsFor(
  critere: CriterionScore["critere"],
  pelvisSagSign: number,
  progression: Progression
): Recommendation[] {
  const exerciseMap =
    progression === "handstand" ? HANDSTAND_EXERCISE_MAP : PLANCHE_EXERCISE_MAP;

  if (critere === "pelvis_deviation") {
    return pelvisSagSign >= 0
      ? exerciseMap.pelvis_deviation_sag
      : exerciseMap.pelvis_deviation_pike;
  }
  return exerciseMap[critere] ?? [];
}
