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
  | "handstand"
  | "tuck_front_lever"
  | "advanced_tuck_front_lever"
  | "one_leg_front_lever"
  | "straddle_front_lever"
  | "full_front_lever";

type Threshold = { target: number; tolerance: number };
type ShoulderProtractionThreshold = Threshold & { mode: "minimum" | "band" };

export type ProgressionThresholds = {
  body_line_angle_from_horizontal?: Threshold;
  // Tronc seul (épaule -> hanche). Utilisé quand la ligne épaule-cheville
  // n'a pas de sens : figures à une jambe, où les deux chevilles sont dans
  // des positions différentes.
  torso_angle?: Threshold;
  elbow_angle: Threshold;
  // Optionnel : sur une figure asymétrique, la moyenne gauche/droite mélange
  // une jambe tendue et une jambe repliée et ne décrit ni l'une ni l'autre.
  // L'inclure quand même avec une tolérance énorme reviendrait à ajouter un
  // critère toujours proche de 10, qui gonflerait la note globale sans rien
  // mesurer.
  hip_angle?: Threshold;
  knee_angle?: Threshold;
  // Genou et hanche de la jambe la plus tendue. Sur une figure à une
  // jambe, les moyennes gauche/droite ci-dessus mélangent la jambe tendue
  // et la jambe repliée, et ne décrivent aucune des deux.
  straightest_knee_angle?: Threshold;
  straightest_leg_hip_angle?: Threshold;
  // Genou de la jambe qui doit être repliée. C'est ce critère qui
  // distingue réellement une figure à une jambe d'une figure à deux jambes
  // tendues : sans lui, un full front lever noté en single leg obtiendrait
  // un score excellent, puisque sa jambe tendue est parfaite et que rien
  // ne vérifierait la seconde.
  bent_knee_angle?: Threshold;
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

  // Front Lever : ajouté le 2026-08-26 avec des seuils entièrement
  // raisonnés, RECALIBRÉ le 2026-09-01 sur 20 échantillons réels notés par
  // l'utilisateur (5 par variation), par minimisation de l'écart entre sa
  // note et celle de la grille.
  //
  // Erreur moyenne avant -> après : tuck 0.60 -> 0.44, advanced tuck
  // 1.19 -> 0.43, straddle 0.60 -> 0.28, full 0.72 -> 0.25.
  //
  // Deux règles suivies pendant l'ajustement, à reprendre pour toute
  // future recalibration :
  //
  // 1. Les CIBLES de critères dont la valeur idéale est une évidence
  //    biomécanique (coude et genou tendus = 180°) n'ont PAS été
  //    ajustées, seule leur tolérance l'a été. Le solveur voulait ramener
  //    la cible de coude à 158-167°, parce qu'aucun échantillon n'a le
  //    bras parfaitement tendu — ce serait confondre ce que fait
  //    l'utilisateur avec ce qu'il faut faire, et un bras verrouillé à
  //    180° aurait alors été moins bien noté qu'un bras fléchi.
  //    La tolérance, elle, exprime l'écart jugé acceptable : c'est bien
  //    une donnée à calibrer, et l'utilisateur s'avère plus indulgent que
  //    prévu sur le coude (jusqu'à 35° en advanced tuck et full).
  //
  // 2. Les tolérances sont bornées à 35° maximum. Sans borne, le solveur
  //    élargit un critère jusqu'à le rendre toujours proche de 10 : il
  //    disparaît alors du barème, ce qui réduit l'erreur sur ces quelques
  //    échantillons mais supprime une mesure réelle.
  //
  // Réserve : 5 échantillons par variation restent peu, et plusieurs sont
  // la même exécution notée sous des variations différentes. Ces seuils
  // sont bien meilleurs que des valeurs devinées, pas encore solides.
  //
  // one_leg_front_lever N'A PAS été recalibré : 4 échantillons seulement,
  // dont 2 antérieurs aux mesures asymétriques et donc inexploitables.
  //
  // Pas de critère d'épaule (protraction ou flexion) pour le front lever :
  // contrairement à la planche (poussée) ou au handstand (overhead), le
  // signal technique clé du front lever est surtout la rétraction/dépression
  // scapulaire, une position d'omoplate plutôt qu'un angle articulaire
  // propre — mal capturée par une projection 2D d'un seul point. Plutôt que
  // d'inventer un critère non fiable, on s'en tient à coude/hanche (+
  // genou/axe du corps dès que les jambes sont tendues), comme pour la
  // planche.
  //
  // hip_angle (épaule-hanche-genou) : tolérance volontairement large en
  // tuck/advanced tuck, la vraie cible ne sera connue qu'après calibration —
  // l'expérience de la Tuck Planche (cible réelle 47°, très loin d'une
  // estimation a priori) incite à la prudence ici.
  tuck_front_lever: {
    elbow_angle: { target: 176, tolerance: 18 },
    hip_angle: { target: 62, tolerance: 45 },
  },
  advanced_tuck_front_lever: {
    elbow_angle: { target: 176, tolerance: 35 },
    hip_angle: { target: 110, tolerance: 16 },
  },
  // Single Leg Front Lever : une jambe tendue, l'autre repliée. Ajouté le
  // 2026-09-01. Figure ASYMÉTRIQUE, donc notée différemment des autres :
  // les critères moyennés gauche/droite (hip_angle, knee_angle) et la
  // ligne épaule-cheville n'ont ici aucun sens, puisqu'ils mélangent une
  // jambe tendue et une jambe repliée. On note donc le tronc seul et la
  // jambe tendue isolément.
  //
  // Seuils raisonnés (DRAFT, confiance faible) comme le reste du front
  // lever : difficulté située entre l'advanced tuck et le straddle, d'où
  // un corps attendu proche de l'horizontale mais avec plus de tolérance
  // qu'en straddle.
  one_leg_front_lever: {
    torso_angle: { target: 5, tolerance: 12 },
    elbow_angle: { target: 178, tolerance: 16 },
    // Volontairement pas de hip_angle ni de knee_angle : ce sont des
    // moyennes gauche/droite, sans signification quand une jambe est
    // tendue et l'autre repliée. Remplacés par les deux critères
    // ci-dessous, qui isolent la jambe tendue.
    straightest_knee_angle: { target: 180, tolerance: 14 },
    straightest_leg_hip_angle: { target: 170, tolerance: 20 },
    // Tolérance large (les pratiquants replient plus ou moins la jambe
    // libre), mais suffisante pour sanctionner une jambe restée tendue :
    // à 179° l'écart vaut près de 2,5 fois la tolérance, ce qui fait
    // tomber ce critère sous 1,5/10.
    bent_knee_angle: { target: 80, tolerance: 40 },
  },
  straddle_front_lever: {
    body_line_angle_from_horizontal: { target: 8, tolerance: 15 },
    elbow_angle: { target: 180, tolerance: 15 },
    hip_angle: { target: 166, tolerance: 13 },
    knee_angle: { target: 180, tolerance: 16 },
  },
  full_front_lever: {
    body_line_angle_from_horizontal: { target: 2, tolerance: 11 },
    elbow_angle: { target: 180, tolerance: 35 },
    hip_angle: { target: 178, tolerance: 10 },
    knee_angle: { target: 180, tolerance: 19 },
  },
};
