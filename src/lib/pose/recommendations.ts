import type { CriterionScore } from "./scoring";
import type { Progression } from "./grid";
import { tierFor, type ScoreTier } from "./report";

export type Recommendation = { exercice: string; raison: string };

// Un conseil par critère est décliné en 3 paliers selon le score obtenu :
// - "faible" : la base n'est pas là, on propose un exercice fondamental.
// - "bon" : la position est globalement correcte, on donne un ajustement fin.
// - "optimal" : c'est déjà solide, un conseil de maintien/finition suffit —
//   proposer un exercice de débutant ici serait hors sujet et frustrant
//   pour quelqu'un qui a déjà un niveau avancé sur ce point précis.
type TieredRecommendations = Record<ScoreTier, Recommendation[]>;

const PLANCHE_EXERCISE_MAP: Record<string, TieredRecommendations> = {
  shoulder_protraction: {
    faible: [
      {
        exercice: "Planche lean (lean progressif contre un mur ou au sol)",
        raison:
          "Épaules pas assez avancées devant les poignets = charge insuffisante sur les avant-bras, hold instable.",
      },
      {
        exercice: "Scapula push-up",
        raison: "Travaille le contrôle scapulaire indispensable à une bonne protraction.",
      },
    ],
    bon: [
      {
        exercice: "Pseudo planche push-up, tempo lent (3s en bas)",
        raison:
          "La protraction est là mais encore un peu courte — le tempo lent force à aller chercher les derniers degrés d'avancée.",
      },
    ],
    optimal: [
      {
        exercice: "Maintiens le cue « pousser le sol loin devant » sur des holds plus longs",
        raison: "La protraction est déjà excellente, l'enjeu maintenant est de la tenir dans la durée.",
      },
    ],
  },
  pelvis_deviation_sag: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "Les hanches tombent (sag) au lieu de rester alignées épaule-hanche-cheville.",
      },
      {
        exercice: "Tuck planche isométrique avec cue verbal « nombril vers colonne »",
        raison: "Renforce le gainage nécessaire pour éviter le sag du bassin.",
      },
    ],
    bon: [
      {
        exercice: "Hollow body hold avec pause en fin de série, jambes plus tendues",
        raison: "Le sag est léger — un gainage un peu plus tenu en fin de série referme le dernier écart.",
      },
    ],
    optimal: [
      {
        exercice: "Rien à corriger sur le gainage — surveille juste la fatigue en fin de hold",
        raison: "L'alignement est déjà quasi parfait, le seul risque restant est un relâchement en fin d'effort.",
      },
    ],
  },
  pelvis_deviation_pike: {
    faible: [
      {
        exercice: "Straddle planche avec cue « pousser les talons vers l'arrière »",
        raison: "Les hanches remontent (pike) au lieu de rester alignées épaule-hanche-cheville.",
      },
    ],
    bon: [
      {
        exercice: "Même position avec cue « ouvrir légèrement les hanches vers l'avant »",
        raison: "Léger pike résiduel — un ajustement de cue suffit, pas besoin de revenir à un exercice plus facile.",
      },
    ],
    optimal: [
      {
        exercice: "Rien à corriger — reste attentif au pike en fin de hold quand la fatigue arrive",
        raison: "L'alignement est déjà quasi parfait.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Tuck hold isométrique (paumes au sol)",
        raison: "Renforce le contrôle de l'angle hanche-genou spécifique à ta progression actuelle.",
      },
      {
        exercice: "L-sit progressif",
        raison: "Développe la force des fléchisseurs de hanche nécessaire pour tenir l'angle cible.",
      },
    ],
    bon: [
      {
        exercice: "Même position, réduis légèrement l'angle de hanche de quelques degrés à chaque série",
        raison: "L'angle est proche de la cible — un ajustement progressif plutôt qu'un nouvel exercice.",
      },
    ],
    optimal: [
      {
        exercice: "Angle de hanche déjà maîtrisé — travaille plutôt la durée du hold à cet angle",
        raison: "Rien à corriger ici, la priorité passe à l'endurance plutôt qu'à la technique.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Renforcement triceps isolé (push-up diamant, dips)",
        raison: "Coudes fléchis pour compenser un manque de force, ce qui invalide la figure à haut niveau.",
      },
      {
        exercice: "Réduire la durée du hold, prioriser la forme sur le temps",
        raison: "Mieux vaut un hold court avec les bras tendus qu'un hold long en compensant avec les coudes.",
      },
    ],
    bon: [
      {
        exercice: "Cue « verrouiller activement les coudes » dès la première seconde du hold",
        raison: "Le fléchissement est léger et apparaît souvent après quelques secondes — un cue de verrouillage actif corrige ça.",
      },
    ],
    optimal: [
      {
        exercice: "Verrouillage déjà excellent — rien à ajouter sur ce point",
        raison: "Les bras restent tendus sur toute la durée du hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
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
    bon: [
      {
        exercice: "Cue « pointes de pieds actives » pour finir de tendre les jambes",
        raison: "Le fléchissement résiduel est faible — un cue actif suffit à corriger le reste.",
      },
    ],
    optimal: [
      {
        exercice: "Jambes déjà bien verrouillées — rien à ajouter sur ce point",
        raison: "La ligne des jambes est nette sur tout le hold.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Hold isométrique dans la position cible avec cue « pousser vers le sol »",
        raison:
          "Le corps n'est pas assez parallèle au sol pour cette progression — souvent un manque de force d'épaules plus que de technique.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cherche à abaisser les pieds de quelques centimètres supplémentaires",
        raison: "L'axe est proche de l'horizontale — un ajustement fin plutôt qu'un retour à un exercice plus facile.",
      },
    ],
    optimal: [
      {
        exercice: "Axe déjà excellent — travaille plutôt la durée du hold dans cette position",
        raison: "Rien à corriger sur l'alignement du corps.",
      },
    ],
  },
};

const HANDSTAND_EXERCISE_MAP: Record<string, TieredRecommendations> = {
  shoulder_flexion: {
    faible: [
      {
        exercice: "Handstand dos au mur (chest-to-wall)",
        raison:
          "Manque d'ouverture d'épaule — pousse fort dans le sol et cherche à cacher tes oreilles avec tes épaules pour éviter de cambrer le dos.",
      },
      {
        exercice: "Pike push-up",
        raison: "Renforce les épaules dans l'amplitude overhead nécessaire à l'ouverture complète.",
      },
    ],
    bon: [
      {
        exercice: "Handstand dos au mur avec cue « pousser encore plus le sol, oreilles cachées »",
        raison: "L'ouverture est presque là — un cue de fin d'amplitude referme l'écart restant.",
      },
    ],
    optimal: [
      {
        exercice: "Ouverture d'épaule déjà excellente — rien à ajouter sur ce point",
        raison: "Les bras restent bien alignés overhead sur tout le hold.",
      },
    ],
  },
  pelvis_deviation_sag: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "Le bassin part en arche (banana handstand) au lieu de rester aligné épaule-hanche-cheville.",
      },
      {
        exercice: "Handstand dos au mur avec cue « fessiers serrés, nombril rentré »",
        raison: "Renforce le gainage nécessaire pour garder une ligne droite en l'air.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « fessiers serrés » dès les premières secondes du hold",
        raison: "L'arche est légère et apparaît souvent en fin de hold — un cue précoce corrige ça.",
      },
    ],
    optimal: [
      {
        exercice: "Ligne de corps déjà droite — rien à ajouter sur ce point",
        raison: "Le gainage tient bien sur toute la durée du hold.",
      },
    ],
  },
  pelvis_deviation_pike: {
    faible: [
      {
        exercice: "Handstand face au mur avec cue « pousser le sol, hanches ouvertes »",
        raison: "Le bassin est trop replié vers l'avant au lieu de rester aligné épaule-hanche-cheville.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « ouvrir légèrement plus les hanches »",
        raison: "Le repli est léger — un ajustement de cue suffit.",
      },
    ],
    optimal: [
      {
        exercice: "Ligne de corps déjà droite — rien à ajouter sur ce point",
        raison: "L'alignement est déjà quasi parfait.",
      },
    ],
  },
  hip_angle: {
    faible: [
      {
        exercice: "Hollow body hold",
        raison: "Renforce le gainage qui maintient la ligne hanche-genou droite en équilibre.",
      },
      {
        exercice: "Handstand dos au mur, dos plat contre le mur",
        raison: "Donne un repère physique pour sentir une ligne de corps réellement droite.",
      },
    ],
    bon: [
      {
        exercice: "Handstand dos au mur, cue « allonger la hanche » en fin de hold",
        raison: "L'ouverture de hanche est presque complète — un cue de fin d'amplitude suffit.",
      },
    ],
    optimal: [
      {
        exercice: "Ligne hanche-genou déjà droite — rien à ajouter sur ce point",
        raison: "L'équilibre ne repose pas sur une compensation de hanche.",
      },
    ],
  },
  elbow_angle: {
    faible: [
      {
        exercice: "Handstand push-up négatif contre un mur",
        raison: "Coudes fléchis pour compenser un manque de force d'épaules, ce qui invalide la figure à haut niveau.",
      },
      {
        exercice: "Réduire la durée du hold, prioriser bras tendus sur le temps",
        raison: "Mieux vaut un hold court avec les bras verrouillés qu'un hold long en compensant avec les coudes.",
      },
    ],
    bon: [
      {
        exercice: "Cue « verrouiller activement les coudes » dès la première seconde du hold",
        raison: "Le fléchissement est léger — un cue de verrouillage actif corrige le reste.",
      },
    ],
    optimal: [
      {
        exercice: "Verrouillage déjà excellent — rien à ajouter sur ce point",
        raison: "Les bras restent tendus sur toute la durée du hold.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Handstand dos au mur, jambes actives et tendues",
        raison: "Genoux fléchis — casse la ligne verticale du corps et complique l'équilibre.",
      },
    ],
    bon: [
      {
        exercice: "Cue « pointes de pieds actives, jambes qui poussent vers le plafond »",
        raison: "Le fléchissement résiduel est faible — un cue actif suffit à finir de tendre les jambes.",
      },
    ],
    optimal: [
      {
        exercice: "Jambes déjà bien verrouillées — rien à ajouter sur ce point",
        raison: "La ligne verticale est nette sur tout le hold.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Handstand dos au mur pour sentir la ligne verticale",
        raison: "Le corps n'est pas assez vertical — repère physique utile pour corriger l'axe global.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « s'étirer encore plus vers le plafond »",
        raison: "L'axe est proche de la verticale — un ajustement fin plutôt qu'un retour au mur.",
      },
    ],
    optimal: [
      {
        exercice: "Axe déjà vertical — travaille plutôt la durée du hold en équilibre libre",
        raison: "Rien à corriger sur l'alignement du corps.",
      },
    ],
  },
};

export function pickWeakestCriterion(scores: CriterionScore[]): CriterionScore {
  return scores.reduce((worst, s) => (s.score < worst.score ? s : worst));
}

export function recommendationsFor(
  critere: CriterionScore["critere"],
  score: number,
  pelvisSagSign: number,
  progression: Progression
): Recommendation[] {
  const exerciseMap =
    progression === "handstand" ? HANDSTAND_EXERCISE_MAP : PLANCHE_EXERCISE_MAP;
  const tier = tierFor(score);

  const key =
    critere === "pelvis_deviation"
      ? pelvisSagSign >= 0
        ? "pelvis_deviation_sag"
        : "pelvis_deviation_pike"
      : critere;

  return exerciseMap[key]?.[tier] ?? [];
}
