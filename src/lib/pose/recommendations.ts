import type { CriterionScore } from "./scoring";
import type { AnyProgression, Progression } from "./grid";
import { tierFor, figureFromProgression, type ScoreTier } from "./report";

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
  // Variante de hip_angle utilisée uniquement en Tuck/Advanced Tuck (voir
  // recommendationsFor) : la hanche est plus ouverte que la cible, donc le
  // tuck n'est pas assez compact/arrondi. Pas de mesure directe de la
  // courbure du dos possible (MediaPipe n'a aucun point sur la colonne),
  // ce cue reste donc formulé via le proxy hip_angle plutôt qu'une vraie
  // mesure de rondeur.
  hip_angle_open: {
    faible: [
      {
        exercice: "Tuck hold isométrique, cue « arrondis le dos, ramène les hanches vers la poitrine »",
        raison:
          "Les hanches sont trop ouvertes pour cette progression — un tuck plus compact et plus arrondi rend la position plus stable.",
      },
      {
        exercice: "L-sit progressif, genoux ramenés loin vers la poitrine",
        raison: "Développe la force de flexion de hanche nécessaire pour resserrer le tuck.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « arrondis un peu plus le dos » à chaque série",
        raison: "L'angle est proche de la cible — un ajustement de compacité plutôt qu'un nouvel exercice.",
      },
    ],
    optimal: [
      {
        exercice: "Compacité du tuck déjà maîtrisée — travaille plutôt la durée du hold",
        raison: "Rien à corriger ici, la priorité passe à l'endurance plutôt qu'à la technique.",
      },
    ],
  },
  hip_angle_closed: {
    faible: [
      {
        exercice: "Tuck hold isométrique, cue « ouvre très légèrement les hanches »",
        raison:
          "Le tuck est plus refermé que la cible — un excès de flexion de hanche peut nuire à l'équilibre autant qu'un manque.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « ouvre très légèrement les hanches » à chaque série",
        raison: "L'angle est proche de la cible — un ajustement fin suffit.",
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

const FRONT_LEVER_EXERCISE_MAP: Record<string, TieredRecommendations> = {
  hip_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold (genoux à la poitrine, suspendu à la barre)",
        raison: "Renforce le contrôle de l'angle hanche-genou spécifique à ta progression actuelle.",
      },
      {
        exercice: "Ice cream makers (rowing excentrique vers la position tuck)",
        raison: "Développe la force de traction nécessaire pour tenir l'angle cible sans se dégrader.",
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
  // Voir hip_angle_open/hip_angle_closed dans PLANCHE_EXERCISE_MAP : même
  // logique, réservée à Tuck/Advanced Tuck Front Lever.
  hip_angle_open: {
    faible: [
      {
        exercice: "Tuck front lever hold, cue « arrondis le dos, genoux loin vers la poitrine »",
        raison:
          "Les hanches sont trop ouvertes pour cette progression — un tuck plus compact et plus arrondi rend la position plus tenable.",
      },
      {
        exercice: "Ice cream makers, insiste sur la position la plus repliée",
        raison: "Développe la force de traction nécessaire pour resserrer le tuck sans se dégrader.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « arrondis un peu plus le dos » à chaque série",
        raison: "L'angle est proche de la cible — un ajustement de compacité plutôt qu'un nouvel exercice.",
      },
    ],
    optimal: [
      {
        exercice: "Compacité du tuck déjà maîtrisée — travaille plutôt la durée du hold",
        raison: "Rien à corriger ici, la priorité passe à l'endurance plutôt qu'à la technique.",
      },
    ],
  },
  hip_angle_closed: {
    faible: [
      {
        exercice: "Tuck front lever hold, cue « ouvre très légèrement les hanches »",
        raison:
          "Le tuck est plus refermé que la cible — un excès de flexion de hanche peut nuire au contrôle autant qu'un manque.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « ouvre très légèrement les hanches » à chaque série",
        raison: "L'angle est proche de la cible — un ajustement fin suffit.",
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
        exercice: "Straight-arm pulldown (poulie ou élastique, bras tendus)",
        raison:
          "Renforce le grand dorsal en bras tendu — la force qui manque pour garder les coudes verrouillés au lieu de tirer avec les bras.",
      },
      {
        exercice: "Réduire la durée du hold, prioriser la forme sur le temps",
        raison: "Mieux vaut un hold court avec les bras tendus qu'un hold long en compensant avec les coudes.",
      },
    ],
    bon: [
      {
        exercice: "Cue « verrouiller activement les coudes » dès la sortie de traction",
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
        exercice: "Étirements ischio-jambiers + gainage jambes tendues en suspension",
        raison: "Genoux fléchis — les jambes doivent rester tendues pour cette variation.",
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
  // Critères propres aux figures asymétriques (single leg front lever) :
  // le tronc et la jambe tendue sont notés séparément, puisque les moyennes
  // gauche/droite n'ont pas de sens quand les deux jambes diffèrent.
  torso_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold, cue « poitrine ouverte, hanches au niveau des épaules »",
        raison:
          "Le tronc n'est pas assez horizontal — c'est la base de la figure, avant même la position des jambes.",
      },
      {
        exercice: "Ice cream makers (rowing excentrique bras tendus)",
        raison: "Développe la force de traction nécessaire pour tenir le tronc à l'horizontale.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « monter légèrement la poitrine » en fin de hold",
        raison: "Le tronc est presque à l'horizontale — un ajustement fin suffit.",
      },
    ],
    optimal: [
      {
        exercice: "Tronc déjà bien horizontal — travaille plutôt la durée du hold",
        raison: "Rien à corriger sur l'alignement du tronc.",
      },
    ],
  },
  straightest_knee_angle: {
    faible: [
      {
        exercice: "Étirements ischio-jambiers + cue « pointe de pied active » sur la jambe tendue",
        raison:
          "La jambe censée être tendue reste fléchie, ce qui raccourcit le levier et fausse la difficulté réelle de la figure.",
      },
    ],
    bon: [
      {
        exercice: "Cue « verrouiller le genou » dès la sortie de traction",
        raison: "Le fléchissement résiduel est faible — un cue actif suffit à finir de tendre.",
      },
    ],
    optimal: [
      {
        exercice: "Jambe tendue déjà bien verrouillée — rien à ajouter sur ce point",
        raison: "La ligne de la jambe est nette sur tout le hold.",
      },
    ],
  },
  straightest_leg_hip_angle: {
    faible: [
      {
        exercice: "Tuck front lever hold, cue « pousser le talon de la jambe tendue loin derrière »",
        raison:
          "La jambe tendue reste repliée vers le buste au lieu de prolonger le tronc — le levier est donc plus court que la figure ne le laisse croire.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cue « allonger la hanche » sur la jambe tendue",
        raison: "L'ouverture est presque complète — un cue de fin d'amplitude referme l'écart.",
      },
    ],
    optimal: [
      {
        exercice: "Hanche de la jambe tendue déjà bien ouverte — travaille la durée",
        raison: "Rien à corriger sur l'alignement de cette jambe.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Skin the cat + hold isométrique dans la position cible",
        raison:
          "Le corps n'est pas assez parallèle au sol pour cette progression — souvent un manque de gainage et de force de traction plus que de technique.",
      },
    ],
    bon: [
      {
        exercice: "Même position, cherche à relever légèrement les pieds pour repasser à l'horizontale",
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

export function pickWeakestCriterion(scores: CriterionScore[]): CriterionScore {
  return scores.reduce((worst, s) => (s.score < worst.score ? s : worst));
}

// Progressions où hip_angle cible une position repliée (tuck) : c'est là,
// et uniquement là, qu'un écart vers l'ouverture se traduit par "pas assez
// arrondi/compact" (voir hip_angle_open/hip_angle_closed). En Straddle/Full/
// Handstand, la cible est au contraire tendue (~170-180°), donc la même
// logique de direction n'aurait pas le même sens.
const TUCK_FAMILY_PROGRESSIONS: Progression[] = [
  "tuck_planche",
  "advanced_tuck_planche",
  "tuck_front_lever",
  "advanced_tuck_front_lever",
];

// Dragon flag. La faute dominante est toujours la même : casser à la hanche
// pour raccourcir le levier, souvent sans s'en rendre compte. Les conseils
// tournent donc autour du gainage antérieur et du contrôle excentrique, pas
// autour de la force de bras.
const DRAGON_FLAG_EXERCISE_MAP: Record<string, TieredRecommendations> = {
  hip_angle: {
    faible: [
      {
        exercice: "Dragon flag négatif, descente en 5 secondes",
        raison:
          "La hanche casse parce que le gainage lâche avant la fin de la descente. L'excentrique lent construit exactement la zone qui cède.",
      },
      {
        exercice: "Hollow body hold, 3 x 30 s",
        raison:
          "Sans position creuse tenue au sol, elle ne tiendra pas non plus en suspension inversée.",
      },
    ],
    bon: [
      {
        exercice: "Dragon flag en tuck, pauses de 3 s à mi-descente",
        raison:
          "La ligne est presque là — les pauses forcent à la tenir là où elle commence à céder.",
      },
    ],
    optimal: [
      {
        exercice: "Allonge le temps de maintien plutôt que d'ouvrir davantage",
        raison: "La hanche est verrouillée, l'enjeu devient l'endurance de gainage.",
      },
    ],
  },
  knee_angle: {
    faible: [
      {
        exercice: "Dragon flag jambes serrées, orteils pointés",
        raison:
          "Des genoux fléchis raccourcissent le levier et faussent la difficulté annoncée.",
      },
    ],
    bon: [
      {
        exercice: "Cue « pousse les talons vers le mur d'en face »",
        raison: "Les jambes se tendent presque complètement, ce cue va chercher les derniers degrés.",
      },
    ],
    optimal: [
      {
        exercice: "Rien à corriger sur les genoux",
        raison: "Ligne de jambes propre.",
      },
    ],
  },
  body_line_angle: {
    faible: [
      {
        exercice: "Dragon flag en tuck puis straddle avant la version complète",
        raison:
          "Le corps remonte trop haut : le levier actuel dépasse ta force de gainage. Raccourcis-le avant de l'allonger.",
      },
    ],
    bon: [
      {
        exercice: "Négatifs jusqu'à l'horizontale, remontée assistée",
        raison: "La descente est bonne, il manque les derniers degrés vers l'horizontale.",
      },
    ],
    optimal: [
      {
        exercice: "Travaille la durée de maintien à cette inclinaison",
        raison: "L'inclinaison est excellente, c'est le temps qui fera la différence.",
      },
    ],
  },
  torso_angle: {
    faible: [
      {
        exercice: "Dragon flag négatif en tuck, épaules bien plaquées au banc",
        raison:
          "Le tronc reste trop vertical : la rotation doit se faire autour des épaules, pas autour des hanches.",
      },
    ],
    bon: [
      {
        exercice: "Pauses isométriques en fin de descente",
        raison: "Le tronc descend bien, il manque du contrôle sur les derniers degrés.",
      },
    ],
    optimal: [
      {
        exercice: "Passe à la variation supérieure",
        raison: "Le tronc est bas et contrôlé, la tuck ne te fait plus progresser.",
      },
    ],
  },
};

// Exercices à répétition. Les quatre critères sont les mêmes pour tous les
// mouvements, les conseils le sont donc aussi : ils portent sur la façon
// d'exécuter une série, pas sur une figure particulière.
const REP_EXERCISE_MAP: Record<string, TieredRecommendations> = {
  rep_lockout: {
    faible: [
      {
        exercice: "Marque une pause d'une seconde en bas de chaque répétition",
        raison:
          "Repartir sans extension complète escamote la partie la plus dure du mouvement, celle qui construit la force.",
      },
      {
        exercice: "Baisse le nombre de répétitions et va chercher l'amplitude complète",
        raison: "Mieux vaut cinq répétitions entières que douze amputées.",
      },
    ],
    bon: [
      {
        exercice: "Descente contrôlée en 3 secondes",
        raison: "L'extension est presque complète, le tempo lent va chercher les derniers degrés.",
      },
    ],
    optimal: [
      {
        exercice: "Rien à corriger sur l'extension",
        raison: "Chaque répétition repart d'une position complète.",
      },
    ],
  },
  rep_peak: {
    faible: [
      {
        exercice: "Réduis la difficulté jusqu'à pouvoir aller au bout",
        raison:
          "Les répétitions sont écourtées en haut : la charge actuelle dépasse ce que tu peux mener à son terme.",
      },
    ],
    bon: [
      {
        exercice: "Pause d'une seconde en haut de chaque répétition",
        raison: "L'amplitude y est presque, la pause empêche de couper la fin du mouvement.",
      },
    ],
    optimal: [
      {
        exercice: "Amplitude complète, tu peux augmenter le volume",
        raison: "Les répétitions sont menées jusqu'au bout.",
      },
    ],
  },
  rep_control: {
    faible: [
      {
        exercice: "Répétitions strictes avec pause d'une seconde en bas",
        raison:
          "Le bassin oscille : le mouvement est lancé. La pause casse l'élan et oblige à repartir de la force seule.",
      },
      {
        exercice: "Hollow body hold, 3 x 30 s",
        raison: "L'élan vient d'un tronc qui n'est pas gainé, c'est là qu'il faut travailler.",
      },
    ],
    bon: [
      {
        exercice: "Cue « serre les fessiers et les abdos avant de tirer »",
        raison: "Le balancement est léger, un cue de gainage suffit souvent à le supprimer.",
      },
    ],
    optimal: [
      {
        exercice: "Rien à corriger, le corps reste gainé",
        raison: "Les répétitions sont tirées et non lancées.",
      },
    ],
  },
  rep_form: {
    faible: [
      {
        exercice: "Gainage planche 3 x 40 s, puis reprends la série",
        raison:
          "Le corps reste cassé à la hanche pendant tout le mouvement : ce n'est pas un problème de force de bras mais de gainage, et ça raccourcit la course.",
      },
      {
        exercice: "Cue « serre les fessiers, une seule ligne des épaules aux talons »",
        raison:
          "La cassure est souvent inconsciente. Un repère verbal avant chaque série suffit souvent à la corriger.",
      },
    ],
    bon: [
      {
        exercice: "Filme-toi de profil et vérifie la ligne à mi-répétition",
        raison:
          "La tenue est correcte mais se relâche par moments — c'est en général au passage le plus dur du mouvement.",
      },
    ],
    optimal: [
      {
        exercice: "Rien à corriger, le corps reste aligné",
        raison: "La position est tenue d'un bout à l'autre de la série.",
      },
    ],
  },
  rep_tempo: {
    faible: [
      {
        exercice: "Arrête la série deux répétitions avant l'échec",
        raison:
          "Le tempo s'effondre en fin de série : les dernières répétitions se font en compensation plus qu'en force.",
      },
    ],
    bon: [
      {
        exercice: "Impose-toi un tempo compté, 2 secondes montée, 2 secondes descente",
        raison: "La régularité est correcte, un tempo compté la rendra franche.",
      },
    ],
    optimal: [
      {
        exercice: "Tempo maîtrisé, tu peux allonger la série",
        raison: "La régularité tient d'un bout à l'autre.",
      },
    ],
  },
};

export function recommendationsFor(
  critere: CriterionScore["critere"],
  score: number,
  pelvisSagSign: number,
  hipAngleDeviation: number,
  progression: AnyProgression
): Recommendation[] {
  const figure = figureFromProgression(progression);
  const exerciseMap =
    figure === "handstand"
      ? HANDSTAND_EXERCISE_MAP
      : figure === "front_lever"
      ? FRONT_LEVER_EXERCISE_MAP
      : figure === "dragon_flag"
      ? DRAGON_FLAG_EXERCISE_MAP
      : figure === "reps"
      ? REP_EXERCISE_MAP
      : PLANCHE_EXERCISE_MAP;
  const tier = tierFor(score);
  const isTuckFamily = (TUCK_FAMILY_PROGRESSIONS as string[]).includes(progression);

  const key =
    critere === "pelvis_deviation"
      ? pelvisSagSign >= 0
        ? "pelvis_deviation_sag"
        : "pelvis_deviation_pike"
      : critere === "hip_angle" && isTuckFamily
      ? hipAngleDeviation > 0
        ? "hip_angle_open"
        : "hip_angle_closed"
      : critere;

  return exerciseMap[key]?.[tier] ?? [];
}
