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
  | "full_front_lever"
  | "tuck_dragon_flag"
  | "straddle_dragon_flag"
  | "full_dragon_flag"
  | "tuck_human_flag"
  | "straddle_human_flag"
  | "full_human_flag";

type Threshold = { target: number; tolerance: number };
type ShoulderProtractionThreshold = Threshold & { mode: "minimum" | "band" };
// Seuil "maximum" : score plein tant que la mesure reste sous la cible,
// pénalité seulement au-delà. Pour un critère où dépasser dans un sens est
// un défaut mais rester en deçà n'en est pas un — le miroir du mode
// "minimum" de la protraction.
type MaximumThreshold = Threshold & { mode: "maximum" };
// Un critère d'inclinaison peut être une bande ou un seuil maximum selon la
// figure. Sur un front lever, la cible est l'horizontale et s'en écarter dans
// un sens comme dans l'autre est une faute : c'est une bande. Sur un dragon
// flag, descendre plus bas n'est jamais une faute, c'est même toute la
// difficulté : c'est un seuil maximum.
type TiltThreshold = Threshold | MaximumThreshold;

export type ProgressionThresholds = {
  body_line_angle_from_horizontal?: TiltThreshold;
  // Tronc seul (épaule -> hanche). Utilisé quand la ligne épaule-cheville
  // n'a pas de sens : figures à une jambe, où les deux chevilles sont dans
  // des positions différentes.
  torso_angle?: TiltThreshold;
  // Optionnel : toutes les figures n'ont pas de critère de coude. Sur un
  // dragon flag, les bras servent d'ancrage derrière la tête et leur angle
  // ne dit rien de la qualité du mouvement. L'inclure quand même reviendrait
  // à ajouter une note qui ne mesure rien et gonfle le score global.
  elbow_angle?: Threshold;
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
  bent_knee_angle?: MaximumThreshold;
  shoulder_protraction?: ShoulderProtractionThreshold;
  shoulder_flexion?: Threshold;
  pelvis_deviation?: Threshold;
};

export const SCORING_GRID: Record<Progression, ProgressionThresholds> = {
  tuck_planche: {
    elbow_angle: { target: 176, tolerance: 20 },
    // Recalibré le 2026-09-01 sur 8 échantillons notés : tolérance 85 → 30.
    // À 85 le critère ne mesurait plus rien (une full planche notée en tuck
    // obtenait encore 7,4). Cible laissée à 47 : c'est la valeur des
    // meilleurs essais et la définition du tuck. Erreur moyenne 1,73 → 1,20.
    hip_angle: { target: 47, tolerance: 30 },
    shoulder_protraction: { target: 0.35, tolerance: 0.2, mode: "minimum" },
  },
  advanced_tuck_planche: {
    elbow_angle: { target: 176, tolerance: 20 },
    // Recalibré le 2026-09-01 sur 15 échantillons notés (la variation la
    // mieux fournie) : les essais bien notés se groupent entre 107 et 131,
    // la cible passe donc de 110 à 119 et la tolérance se resserre à 25.
    // Erreur moyenne 1,69 → 1,50.
    hip_angle: { target: 119, tolerance: 25 },
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
    // Seuil maximum, pas une bande : la figure demande que cette jambe
    // reste repliée, elle ne demande pas un angle précis. La replier
    // davantage n'est pas un défaut, donc tout ce qui est sous 100° vaut
    // 10, et la note ne tombe qu'à mesure que la jambe se tend (0 dès
    // 160°, où il s'agit en fait d'un full front lever).
    // Calibré le 2026-09-01 sur 6 échantillons : erreur 0,89 → 0,63, et
    // le résultat est le même pour tout seuil entre 90 et 120°, signe que
    // c'est bien la forme du critère qui était fausse, pas sa valeur.
    bent_knee_angle: { target: 100, tolerance: 60, mode: "maximum" },
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

  // --- Dragon flag ---
  //
  // SEUILS DRAFT, entièrement raisonnés, aucun échantillon réel. À calibrer
  // via /calibration avant de se fier aux notes.
  //
  // Deux partis pris à connaître avant d'y toucher.
  //
  // L'inclinaison est un seuil MAXIMUM et non une bande : sur un dragon flag,
  // plus le corps descend vers l'horizontale, plus c'est dur et mieux c'est.
  // Une bande centrée sur 20° pénaliserait un corps tenu parfaitement
  // horizontal, ce qui est l'inverse de la réalité.
  //
  // La tuck est notée sur le tronc seul et non sur la ligne épaule-cheville :
  // genoux repliés, cette ligne traverse un corps qui n'existe pas, exactement
  // le problème déjà rencontré sur les figures asymétriques.
  tuck_dragon_flag: {
    torso_angle: { target: 40, tolerance: 50, mode: "maximum" },
    hip_angle: { target: 100, tolerance: 35 },
    knee_angle: { target: 70, tolerance: 40 },
  },
  straddle_dragon_flag: {
    body_line_angle_from_horizontal: { target: 35, tolerance: 55, mode: "maximum" },
    hip_angle: { target: 175, tolerance: 20 },
    knee_angle: { target: 180, tolerance: 18 },
  },
  full_dragon_flag: {
    body_line_angle_from_horizontal: { target: 20, tolerance: 55, mode: "maximum" },
    // La faute classique du dragon flag : casser à la hanche pour soulager le
    // levier. C'est le critère le plus serré de la figure.
    hip_angle: { target: 180, tolerance: 10 },
    knee_angle: { target: 180, tolerance: 12 },
  },

  // --- Drapeau (human flag) ---
  //
  // SEUILS DRAFT, entièrement raisonnés, aucun échantillon réel.
  //
  // Contrairement au dragon flag, l'inclinaison est ici une vraie bande et non
  // un seuil maximum : la cible est l'horizontale, et un corps qui pointe vers
  // le haut est aussi éloigné de la figure qu'un corps qui pique vers le bas.
  //
  // La tuck est notée sur le tronc seul, genoux repliés rendant la ligne
  // épaule-cheville dépourvue de sens — même raisonnement que sur la tuck
  // dragon flag et les figures asymétriques.
  tuck_human_flag: {
    torso_angle: { target: 10, tolerance: 25 },
    elbow_angle: { target: 175, tolerance: 25 },
    hip_angle: { target: 100, tolerance: 35 },
    knee_angle: { target: 70, tolerance: 40 },
  },
  straddle_human_flag: {
    body_line_angle_from_horizontal: { target: 5, tolerance: 20 },
    elbow_angle: { target: 175, tolerance: 22 },
    hip_angle: { target: 172, tolerance: 20 },
    knee_angle: { target: 180, tolerance: 16 },
  },
  full_human_flag: {
    body_line_angle_from_horizontal: { target: 0, tolerance: 15 },
    // Bras du haut qui tire, bras du bas qui pousse : les deux doivent rester
    // tendus, un coude qui plie trahit un corps qui s'affaisse vers la barre.
    elbow_angle: { target: 175, tolerance: 20 },
    hip_angle: { target: 180, tolerance: 12 },
    knee_angle: { target: 180, tolerance: 12 },
  },
};

// ---------------------------------------------------------------------------
// Exercices à répétition
// ---------------------------------------------------------------------------
//
// Grille séparée de SCORING_GRID, et c'est délibéré : un hold se note sur des
// angles tenus, une répétition se note sur deux positions extrêmes atteintes
// et sur la qualité du trajet entre les deux. Les deux n'ont pas les mêmes
// champs, les fondre dans un seul type aurait donné un objet à moitié vide
// dans les deux sens.

export type RepProgression =
  | "australian_pull_up"
  | "strict_pull_up"
  | "bench_dip"
  | "parallel_dip"
  | "incline_push_up"
  | "push_up"
  | "decline_push_up"
  | "box_pistol_squat"
  | "pistol_squat"
  | "handstand_push_up";

export type AnyProgression = Progression | RepProgression;

export type RepThresholds = {
  /** Angle qui oscille le plus nettement, et qui sert à découper les reps. */
  driver: "elbowAngle" | "kneeAngle" | "hipAngle";
  /** Valeurs approximatives du signal aux deux extrémités du mouvement. */
  extendedValue: number;
  flexedValue: number;
  /** Fraction d'amplitude minimale pour qu'une oscillation compte comme rep. */
  minRangeRatio: number;
  /**
   * Verrouillage : angle atteint en position tendue, moyenné sur les
   * répétitions. Noté en seuil MINIMUM — aller plus loin que l'extension
   * complète est impossible, rester en deçà est la faute.
   */
  lockout: Threshold;
  /**
   * Amplitude haute : angle atteint en position fléchie. Noté en seuil
   * MAXIMUM — descendre plus bas que demandé n'est jamais une faute, c'est
   * s'arrêter avant qui en est une.
   */
  peak: Threshold;
  /**
   * Oscillation tolérée de la hanche, en écart type sur la série. C'est la
   * mesure de l'élan : un tirage strict garde le tronc gainé, un tirage lancé
   * fait osciller la hanche. Noté en seuil MAXIMUM.
   *
   * Optionnel, et absent sur les mouvements de jambes : dans un squat la
   * hanche se ferme et s'ouvre par construction, son écart type ne mesure
   * alors plus la triche mais le mouvement lui-même.
   */
  hipSwing?: Threshold;
  /**
   * Angle de hanche MOYEN sur la série : la tenue du corps pendant le
   * mouvement. Noté en bande, s'en écarter dans un sens comme dans l'autre
   * étant une faute.
   *
   * Distinct de `hipSwing`, et les deux sont nécessaires. Quelqu'un qui reste
   * cassé à la hanche du début à la fin d'une série a une oscillation faible,
   * donc un bon score de contrôle, alors que sa position est mauvaise sur
   * toutes les répétitions. Le contrôle voit l'élan, la forme voit la posture.
   *
   * Absent des mouvements de jambes, où la hanche se ferme et s'ouvre par
   * construction : sa moyenne y décrirait le milieu du squat, pas une faute.
   */
  form?: Threshold;
  /**
   * Régularité du tempo entre répétitions, en pourcentage. Seuil MINIMUM.
   * Une série qui se dégrade se voit ici avant de se voir ailleurs.
   */
  tempo: Threshold;
};

// SEUILS DRAFT. Aucun échantillon réel, valeurs entièrement raisonnées à
// partir de la géométrie attendue de chaque mouvement.
export const REP_SCORING_GRID: Record<RepProgression, RepThresholds> = {
  // --- Traction ---
  australian_pull_up: {
    driver: "elbowAngle",
    extendedValue: 172,
    flexedValue: 55,
    minRangeRatio: 0.55,
    lockout: { target: 170, tolerance: 25 },
    peak: { target: 65, tolerance: 45 },
    hipSwing: { target: 7, tolerance: 20 },
    form: { target: 175, tolerance: 20 },
    tempo: { target: 70, tolerance: 40 },
  },
  strict_pull_up: {
    driver: "elbowAngle",
    extendedValue: 175,
    flexedValue: 45,
    minRangeRatio: 0.55,
    lockout: { target: 172, tolerance: 25 },
    peak: { target: 55, tolerance: 45 },
    // Le critère qui sépare une traction stricte d'une traction lancée, et que
    // personne ne peut s'attribuer honnêtement tout seul.
    hipSwing: { target: 8, tolerance: 20 },
    form: { target: 172, tolerance: 22 },
    tempo: { target: 70, tolerance: 40 },
  },

  // --- Dips ---
  bench_dip: {
    driver: "elbowAngle",
    extendedValue: 172,
    flexedValue: 90,
    minRangeRatio: 0.55,
    lockout: { target: 170, tolerance: 28 },
    peak: { target: 95, tolerance: 40 },
    hipSwing: { target: 10, tolerance: 25 },
    // Assis dos au banc, jambes devant : la hanche est fléchie par la position
    // elle-même, la cible n'est donc pas 180 comme sur les autres dips.
    form: { target: 110, tolerance: 35 },
    tempo: { target: 70, tolerance: 40 },
  },
  parallel_dip: {
    driver: "elbowAngle",
    extendedValue: 175,
    flexedValue: 80,
    minRangeRatio: 0.55,
    lockout: { target: 172, tolerance: 25 },
    peak: { target: 85, tolerance: 40 },
    hipSwing: { target: 8, tolerance: 22 },
    form: { target: 168, tolerance: 28 },
    tempo: { target: 70, tolerance: 40 },
  },

  // --- Pompes ---
  incline_push_up: {
    driver: "elbowAngle",
    extendedValue: 170,
    flexedValue: 80,
    minRangeRatio: 0.6,
    lockout: { target: 168, tolerance: 28 },
    peak: { target: 85, tolerance: 40 },
    hipSwing: { target: 7, tolerance: 20 },
    form: { target: 175, tolerance: 18 },
    tempo: { target: 70, tolerance: 40 },
  },
  push_up: {
    driver: "elbowAngle",
    extendedValue: 170,
    flexedValue: 75,
    minRangeRatio: 0.6,
    lockout: { target: 168, tolerance: 25 },
    peak: { target: 80, tolerance: 40 },
    // Plus serré que sur une traction : en pompe, une hanche qui oscille
    // signale un corps qui se casse, pas de l'élan.
    hipSwing: { target: 6, tolerance: 18 },
    form: { target: 175, tolerance: 15 },
    tempo: { target: 70, tolerance: 40 },
  },
  decline_push_up: {
    driver: "elbowAngle",
    extendedValue: 170,
    flexedValue: 72,
    minRangeRatio: 0.6,
    lockout: { target: 168, tolerance: 25 },
    peak: { target: 78, tolerance: 38 },
    hipSwing: { target: 5, tolerance: 16 },
    form: { target: 175, tolerance: 15 },
    tempo: { target: 70, tolerance: 40 },
  },

  // --- Pistol squat ---
  //
  // Pas de critère d'oscillation de hanche : elle se ferme et s'ouvre par
  // construction dans un squat. Et attention, la profondeur réelle se juge
  // aussi à la cheville, angle que angles.ts ne calcule pas encore : la note
  // de profondeur reste donc partielle sur ces deux variations.
  box_pistol_squat: {
    driver: "kneeAngle",
    extendedValue: 172,
    flexedValue: 75,
    minRangeRatio: 0.6,
    lockout: { target: 170, tolerance: 28 },
    peak: { target: 85, tolerance: 45 },
    tempo: { target: 65, tolerance: 45 },
  },
  pistol_squat: {
    driver: "kneeAngle",
    extendedValue: 172,
    flexedValue: 45,
    minRangeRatio: 0.6,
    lockout: { target: 170, tolerance: 25 },
    peak: { target: 55, tolerance: 45 },
    tempo: { target: 65, tolerance: 45 },
  },

  // --- Handstand push-up ---
  //
  // Une pompe exécutée en équilibre sur les mains. Rangée ici et non dans
  // SCORING_GRID malgré son appartenance à la famille handstand : c'est un
  // mouvement à répétitions, sa qualité est dans la trajectoire et non dans
  // une position tenue.
  //
  // L'oscillation de hanche est conservée et serrée : la triche classique du
  // HSPU consiste à casser à la hanche pour raccourcir la course, et le corps
  // doit rester gainé du bassin aux pieds pendant toute la descente.
  handstand_push_up: {
    driver: "elbowAngle",
    extendedValue: 175,
    flexedValue: 75,
    minRangeRatio: 0.55,
    lockout: { target: 172, tolerance: 25 },
    peak: { target: 80, tolerance: 40 },
    hipSwing: { target: 8, tolerance: 20 },
    // Le critère qui manquait sur le HSPU : le corps doit rester tendu du
    // bassin aux pieds pendant toute la descente. Casser à la hanche pour
    // raccourcir la course est la triche classique, et une série entièrement
    // cassée passait inaperçue du contrôle, qui ne voit que les variations.
    form: { target: 178, tolerance: 15 },
    tempo: { target: 65, tolerance: 45 },
  },
};

export function isRepProgression(value: string): value is RepProgression {
  return value in REP_SCORING_GRID;
}
