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
  | "one_leg_dragon_flag"
  | "full_dragon_flag"
  | "tuck_human_flag"
  | "one_leg_human_flag"
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
  // Affaissement du bassin, SIGNÉ, et c'est tout l'intérêt.
  //
  // hip_angle ne peut pas distinguer un dos creusé d'une hanche fermée : il
  // sort d'un acos, donc il vaut toujours entre 0 et 180 degrés, et une
  // hanche en hyperextension à 190 degrés se replie en 170, exactement comme
  // une hanche fermée à 170. Les deux fautes reçoivent la même note alors
  // qu'elles n'ont pas la même gravité.
  //
  // Seuil MAXIMUM sur une valeur signée : une valeur négative, c'est un
  // bassin plus haut que la ligne épaule-cheville, donc une fermeture, et
  // elle passe toujours à 10 ici — hip_angle la sanctionne déjà par son
  // ampleur. Seul l'affaissement, positif, est pénalisé une seconde fois.
  pelvis_sag?: MaximumThreshold;
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
  // CALIBRATION DU 2026-09-07, sur les 19 échantillons enregistrés via
  // /calibration. État par variante : full confirmée sur 3 exécutions
  // conformes, single leg confrontée à 4, tuck toujours en brouillon avec une
  // seule. Aucun seuil n'a bougé, le détail est noté sur chaque variante.
  //
  // CE QUE MESURE VRAIMENT CE LOT
  //
  // Douze des dix-neuf échantillons sont la même vidéo soumise dans la
  // mauvaise variante, et c'est là que la grille s'écarte le plus de l'œil
  // humain : environ 1,5 point trop généreuse. La cause n'est pas un seuil,
  // c'est la moyenne. Sur un full dragon flag exécuté à une jambe,
  // l'inclinaison et le bassin restent parfaits : deux critères sur quatre
  // valent 10, et la note ne peut pas descendre sous 5 quels que soient les
  // seuils des deux autres.
  //
  // Aucun réglage de cette grille ne corrige ça. Le plafonnement sur faute
  // majeure, lui, le ferait : testé sur ce lot, il ramène l'écart de 1,48 à
  // 0,61 sur la tuck, et de 0,94 à 0,68 sur les exécutions conformes de la
  // single leg. C'est une décision d'agrégation qui vaudrait pour toutes les
  // figures de hold, pas un réglage de dragon flag, donc elle n'est pas prise
  // ici.
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
  //
  // CONFRONTÉE À CINQ ÉCHANTILLONS le 2026-09-07, et toujours en brouillon :
  // un seul montre une vraie tuck, les quatre autres sont des exécutions
  // tendues ou à une jambe soumises dans cette catégorie. Sur cette unique
  // exécution conforme la grille tombe à 0,3 de l'œil humain, 9,3 contre 9,
  // ce qui ne prouve rien tout seul.
  //
  // Rien n'a bougé, faute de matière. Le balayage désigne bien des valeurs
  // plus serrées — hanche 20, genou 32, tronc 30 — mais elles s'ajustent sur
  // ce point unique, exactement le réglage à un échantillon qu'on s'interdit
  // ici. À reprendre quand plusieurs vraies tuck auront été enregistrées.
  //
  // Le seuil de tronc à 40 est le seul que l'échantillon conforme soutienne
  // vraiment : ce tronc à 37 degrés a été noté 9 à l'œil, donc un tronc haut
  // n'est pas une faute sur cette variante.
  tuck_dragon_flag: {
    torso_angle: { target: 40, tolerance: 50, mode: "maximum" },
    hip_angle: { target: 100, tolerance: 35 },
    knee_angle: { target: 70, tolerance: 40 },
  },
  // Construits sur le même patron que la Single Leg Front Lever, pour la
  // même raison : avec une jambe tendue et l'autre repliée, hip_angle et
  // knee_angle sont des moyennes gauche/droite qui ne décrivent aucune des
  // deux jambes. Les critères ci-dessous isolent celle qui porte la
  // difficulté.
  //
  // CONFRONTÉS À SIX ÉCHANTILLONS le 2026-09-07, dont quatre exécutions
  // conformes, sans qu'aucune valeur ait eu à bouger. Écart absolu moyen de
  // 0,94 sur ces quatre, mais mal réparti : trois tombent à 0,4 ou moins, et
  // tout l'écart tient dans une exécution notée 4,5 à l'œil contre 7,5 par la
  // grille, tronc à 38 degrés et jambe active à 164.
  //
  // La grille voit pourtant les deux défauts — genou à 4,4, hanche de la
  // jambe tendue à 7,0 — mais la moyenne les dilue derrière un tronc à 8,4 et
  // une jambe repliée à 10. Encore le problème d'agrégation décrit en tête de
  // section, pas un problème de seuil.
  //
  // Resserrer la rampe du tronc de 50 à 10 ferait tomber l'écart moyen de
  // 0,94 à 0,54. Non fait : cette rampe ne touche qu'un seul échantillon du
  // lot, tous les autres troncs étant déjà sous le seuil de 30 degrés, donc
  // notés 10 quelle que soit la rampe. C'est un réglage sur un point unique.
  //
  // bent_knee_angle : déplacer la cible de 100 à 120 ne gagne plus que 0,09
  // sur l'écart moyen, contre 0,16 annoncé sur le lot de deux échantillons.
  // Le gain fond à mesure que le lot grandit, ce qui confirme ce que la
  // calibration de la Single Leg Front Lever avait montré : toute valeur
  // entre 90 et 120 donne le même résultat. La cible reste à 100.
  //
  // torso_angle plutôt que body_line_angle_from_horizontal, comme sur le
  // tuck : la ligne épaule-cheville suppose deux jambes dans la même
  // position, elle traverse un corps qui n'existe pas dès qu'une jambe est
  // repliée.
  one_leg_dragon_flag: {
    torso_angle: { target: 30, tolerance: 50, mode: "maximum" },
    straightest_knee_angle: { target: 180, tolerance: 14 },
    // La cassure à la hanche est la faute classique du dragon flag : la
    // jambe tendue doit prolonger le tronc, pas se replier pour soulager le
    // levier.
    straightest_leg_hip_angle: { target: 175, tolerance: 18 },
    // Seuil maximum et non une bande : la figure demande que cette jambe
    // reste repliée, pas qu'elle atteigne un angle précis. La forme du
    // critère est reprise de la Single Leg Front Lever, où elle a été
    // validée sur échantillons ; sa valeur reste à confirmer ici.
    bent_knee_angle: { target: 100, tolerance: 60, mode: "maximum" },
  },
  full_dragon_flag: {
    // Rampe encore invérifiée au 2026-09-07 : les trois exécutions conformes
    // du lot tiennent leur corps entre 1 et 19 degrés, donc toutes sous le
    // seuil de 20 et notées 10 quelle que soit la rampe. La faire varier de
    // 20 à 75 ne change pas d'un centième l'écart à l'œil humain. Il faudra
    // une exécution franchement haute pour que ce réglage veuille dire
    // quelque chose.
    body_line_angle_from_horizontal: { target: 20, tolerance: 55, mode: "maximum" },
    // SEUIL DRAFT, aucun échantillon. Échelle reprise des tolérances de
    // pelvis_deviation déjà calibrées ailleurs (0,12 sur la full planche et
    // le handstand), la mesure étant rapportée à la même longueur de corps.
    //
    // Sur un dragon flag, perdre le gainage creuse les lombaires et fait
    // tomber le bassin sous la ligne du corps. C'est à la fois la faute
    // technique qui invalide la figure et le mécanisme par lequel on se fait
    // mal, alors que fermer la hanche ne fait que rendre la figure plus
    // facile. D'où une pénalité qui ne vise que ce sens-là.
    pelvis_sag: { target: 0.03, tolerance: 0.12, mode: "maximum" },
    // La faute classique du dragon flag : casser à la hanche pour soulager le
    // levier. C'est le critère le plus serré de la figure.
    //
    // Calibré le 2026-09-07 sur 4 échantillons. Tolérances resserrées de 10 à
    // 9 pour la hanche et de 12 à 8 pour le genou : écart absolu moyen entre
    // la grille et les notes humaines 0,80 avant, 0,54 après. Le genou rejoint
    // la valeur déjà calibrée sur la full planche, où la même exigence de
    // jambes tendues s'applique.
    //
    // REVU LE MÊME JOUR SUR 8 ÉCHANTILLONS, dont trois exécutions conformes :
    // la grille tombe à 0,0, 0,0 et 0,2 des notes données à l'œil. Le balayage
    // place les deux valeurs actuelles pile à l'optimum — hanche 9 (écart
    // 0,08, contre 0,13 à 7 et 0,16 à 11) et genou 8 (0,08, contre 0,17 à 6 et
    // 0,22 à 10). C'est la seule variante du dragon flag qu'on puisse dire
    // calibrée ; rien à y changer.
    hip_angle: { target: 180, tolerance: 9 },
    knee_angle: { target: 180, tolerance: 8 },
  },

  // --- Drapeau (human flag) ---
  //
  // CALIBRATION DU 2026-09-07, sur les 31 échantillons enregistrés via
  // /calibration. Seule la full en ressort validée. Aucun seuil n'a bougé.
  //
  // UN ACCORD PARFAIT SE VÉRIFIE AVANT DE SE CÉLÉBRER
  //
  // Douze de ces trente et un échantillons portent une note humaine identique
  // à celle que la grille calcule, au centième près. Deux explications : soit
  // la note affichée a été ressaisie comme note de référence, auquel cas on
  // confronte la grille à sa propre sortie et l'accord ne prouve rien, soit
  // le jugement est réellement tombé sur la même valeur.
  //
  // La question se tranche en demandant, pas en supposant. Pour la single leg
  // le point a été vérifié : ses notes sont indépendantes, et elles comptent.
  // Le contrôle reste à refaire à chaque passe — c'est un signal à lever, pas
  // un verdict.
  //
  // Ce qu'il reste après vérification : la full et la single leg validées, la
  // tuck et la straddle sans aucune exécution conforme exploitable.
  //
  // Contrairement au dragon flag, l'inclinaison est ici une vraie bande et non
  // un seuil maximum : la cible est l'horizontale, et un corps qui pointe vers
  // le haut est aussi éloigné de la figure qu'un corps qui pique vers le bas.
  //
  // La tuck est notée sur le tronc seul, genoux repliés rendant la ligne
  // épaule-cheville dépourvue de sens — même raisonnement que sur la tuck
  // dragon flag et les figures asymétriques.
  // Neuf échantillons, dont un seul montre une vraie tuck — et sa note est
  // copiée sur la grille, donc inutilisable. Les huit autres sont des jambes
  // tendues ou une seule jambe repliée soumises ici.
  //
  // Sur ces huit, la grille note environ 1,4 point de trop, toujours dans le
  // même sens. Ce n'est pas un problème de seuil mais de moyenne : le tronc
  // et le coude restent excellents quand les jambes ne sont pas groupées, et
  // deux critères à 9 sur quatre empêchent la note de descendre. Même
  // mécanique que sur la tuck dragon flag, même conclusion : rien à régler
  // ici tant que le mode d'agrégation ne change pas.
  tuck_human_flag: {
    torso_angle: { target: 10, tolerance: 25 },
    elbow_angle: { target: 175, tolerance: 25 },
    hip_angle: { target: 100, tolerance: 35 },
    knee_angle: { target: 70, tolerance: 40 },
  },
  // Étape manquante entre la tuck et la straddle, et la plus utilisée des
  // deux dans la progression réelle : une jambe se tend le long du mât, la
  // seconde reste repliée. C'est le premier moment où le levier s'allonge
  // vraiment, sans encore demander l'ouverture de hanche de la straddle.
  //
  // Mêmes critères que la Single Leg Front Lever et la Single Leg Dragon
  // Flag, pour la même raison : jambe tendue d'un côté, repliée de l'autre,
  // hip_angle et knee_angle ne sont plus que des moyennes gauche/droite qui
  // ne décrivent aucune des deux jambes.
  //
  // torso_angle plutôt que la ligne épaule-cheville, qui traverse un corps
  // qui n'existe pas dès qu'une jambe est repliée. En bande et non en seuil
  // maximum, comme le reste de la famille drapeau : la cible est
  // l'horizontale, et pointer vers le haut en éloigne autant que piquer vers
  // le bas.
  //
  // SEUILS DRAFT, aucun échantillon. Les valeurs sont interpolées entre la
  // tuck et la straddle du drapeau pour l'inclinaison et le coude, et
  // reprises telles quelles de la Single Leg Front Lever pour les trois
  // critères de jambe, où elles ont été calibrées sur 6 échantillons.
  // CALIBRÉE le 2026-09-07, six échantillons le jour même de l'ajout de la
  // variante : trois vraies exécutions à une jambe, et trois corps
  // entièrement tendus soumis ici. Écart absolu moyen de 0,09 sur les six,
  // 0,01 sur les trois conformes. Notes confirmées comme indépendantes par
  // leur auteur, malgré leur proximité avec la grille.
  //
  // Deux critères sont confirmés, et deux seulement. bent_knee_angle sépare
  // franchement les deux groupes — 10 sur les trois vraies exécutions, 0 sur
  // les trois corps tendus — et les notes humaines suivent exactement, 8,8 à
  // 9,6 contre 7 à 7,3. torso_angle couvre la plage 5,9 à 10 et l'exécution
  // la moins bien notée du lot est celle dont le tronc est le plus haut.
  //
  // Les trois autres, coude et les deux critères de jambe tendue, restent
  // entre 6,5 et 10 sur tout le lot : aucune exécution ne les a mis en
  // défaut, donc rien n'y est prouvé. Même règle que sur le handstand push-up.
  one_leg_human_flag: {
    torso_angle: { target: 8, tolerance: 22 },
    elbow_angle: { target: 175, tolerance: 24 },
    straightest_knee_angle: { target: 180, tolerance: 14 },
    straightest_leg_hip_angle: { target: 170, tolerance: 20 },
    bent_knee_angle: { target: 100, tolerance: 60, mode: "maximum" },
  },
  // Huit échantillons, aucune vraie straddle : toutes les vidéos soumises ici
  // montrent des jambes serrées ou une seule jambe repliée.
  //
  // Et il y a plus gênant qu'un manque d'échantillons. RIEN NE MESURE
  // L'ÉCARTEMENT DES JAMBES. Les angles de hanche et de genou d'une straddle
  // et d'une full sont les mêmes — jambes tendues des deux côtés — et seule
  // leur ouverture latérale les sépare. Tant que cette mesure n'existe pas,
  // la grille ne peut pas distinguer les deux variantes, et une full soumise
  // en straddle obtient une excellente note. Calibrer les seuils actuels ne
  // corrigerait pas ça : c'est un critère qui manque, pas un seuil mal réglé.
  straddle_human_flag: {
    body_line_angle_from_horizontal: { target: 5, tolerance: 20 },
    elbow_angle: { target: 175, tolerance: 22 },
    hip_angle: { target: 172, tolerance: 20 },
    knee_angle: { target: 180, tolerance: 16 },
  },
  // CALIBRÉE le 2026-09-07 sur 4 exécutions conformes notées indépendamment
  // de la grille : écart absolu moyen 0,29, et les quatre critères sont
  // réellement mis à l'épreuve sur ce lot — l'axe du corps y va de 3,0 à
  // 10,0, la hanche de 1,9 à 9,9. Aucun n'est resté à 10 faute d'exécution
  // qui le mette en défaut, ce qui est la condition pour se dire calibré.
  //
  // Le balayage place chaque valeur actuelle à son optimum ou à un centième :
  // axe du corps 15 (0,29, contre 0,41 à 11 et 0,32 à 20), coude 175 (0,29,
  // contre 0,30 à 170 et 0,45 à 180), hanche 12 (0,29, contre 0,33 à 10 et
  // 0,35 à 16), genou 12 (à égalité avec 10). Élargir la tolérance de coude
  // à 26 gagnerait 0,04 : non fait, c'est sous le bruit de quatre points.
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
  | "planche_push_up"
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
   * Avancée moyenne des épaules devant les poignets sur la série, rapportée
   * à la longueur du buste. Seuil MINIMUM : en avancer plus n'est jamais une
   * faute.
   *
   * Optionnel, et réservé aux mouvements de planche. C'est le seul critère
   * qui sépare une pompe planche d'une pompe ordinaire : les quatre autres
   * ne regardent que le coude, la hanche et le rythme, et une pompe au sol
   * bien exécutée les satisfait tous. Sans lui, la variation serait
   * décorative.
   */
  protraction?: Threshold;
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
  // Pompe planche : une planche complète dont on plie puis retend les bras.
  //
  // CALIBRÉE le 2026-09-08 sur 3 séries notées, après avoir été montée sur des
  // seuils transférés de la full planche et du handstand push-up. Écart absolu
  // moyen entre la grille et l'œil : 0,68 avant, 0,19 après, et les erreurs
  // cessent d'être toutes du même côté.
  //
  // CE QUE LE TRANSFERT AVAIT MANQUÉ
  //
  // Les trois seuils repris de figures TENUES étaient tous trop sévères, et
  // toujours dans le même sens : la grille notait 8,96, 8,98 et 9,23 des
  // séries jugées 10, 9,7 et 9,5. La raison est mécanique, pas statistique.
  // Un hold mesure une position immobile ; une répétition moyenne un corps en
  // mouvement, qui passe par la position idéale sans y rester. Sur les trois
  // critères concernés, la valeur moyennée sur une série est donc
  // structurellement plus basse que celle d'une tenue.
  //
  //   verrouillage 170 -> 165  une série notée 9,5 mesure 160,5 en moyenne
  //                            haute, là où une full planche tenue fait 169
  //   amplitude    100 -> 110  une série notée 9,7 ne descend qu'à 118
  //   protraction  0,7 -> 0,6  la série notée 10, la plus longue des trois
  //                            avec 8 répétitions, mesure 0,60
  //
  // Chaque valeur retenue est la plus EXIGEANTE que les données admettent :
  // le balayage donnait le même écart pour une protraction à 0,5 ou 0,6, et
  // c'est 0,6 qui est pris. Une amplitude à 115 aurait encore gagné 0,06,
  // non fait — elle se réglerait sur l'unique série qui manque de
  // profondeur, et celle-ci ne compte qu'une répétition.
  //
  // form et hipSwing n'ont pas bougé : les trois séries les notent entre 8,6
  // et 10, aucune ne les met en défaut, donc rien n'y est démontré. Desserrer
  // la forme aurait pourtant gagné encore un peu — et c'est exactement le
  // piège, avec trois échantillons tous notés au-dessus de 9,5, minimiser
  // l'écart revient à tout faire tendre vers 10.
  //
  // LES DENTS SONT VÉRIFIÉES. Rejouée sur des contre-exemples construits, la
  // grille proposée note 2,0 une pompe au sol impeccable, 4,5 la même avec
  // les épaules déjà bien avancées, et 5,5 une série cassée à la hanche. Le
  // plafond sur faute majeure fait ce travail : la protraction tombe à 0 et
  // écrase la moyenne au lieu d'y être diluée.
  //
  // lockout à 170 : le haut d'une répétition EST une full planche. Sur les 6
  // full planches notées 8 ou plus, le coude mesure de 165 à 176 degrés,
  // moyenne 169,4. Viser 180, la valeur théorique, aurait pénalisé toutes les
  // exécutions réelles — aucune n'atteint l'extension parfaite sous ce levier.
  // Rampe de 25, la même que sur le handstand push-up, où elle a été discutée
  // puis confirmée sur 7 échantillons.
  //
  // form à 170 : c'est la valeur la mieux soutenue de la grille. La hanche
  // moyenne de ces mêmes 6 full planches vaut 169,9, et le handstand push-up
  // a été recalé sur 6 échantillons à exactement 170. Deux lots
  // indépendants, deux figures différentes, la même valeur. Tolérance 22
  // reprise de la hanche calibrée de la full planche, plus large que les 15
  // du handstand push-up : la dispersion réellement observée sur des planches
  // va de 158 à 178 degrés.
  //
  // protraction à 0,7 : valeur calibrée de la full planche, reprise telle
  // quelle. Les 6 bonnes planches mesurent 0,79 en moyenne. C'est le critère
  // qui empêche une pompe ordinaire de passer pour une pompe planche.
  //
  // peak à 100 et hipSwing à 6 : raisonnés, sans données. Une pompe planche
  // descend beaucoup moins qu'un handstand push-up, le levier l'interdit ;
  // et une hanche qui oscille sous ce levier signale une planche qu'on perd,
  // d'où le seuil de la pompe au sol plutôt que celui du handstand push-up.
  planche_push_up: {
    driver: "elbowAngle",
    extendedValue: 170,
    flexedValue: 100,
    // Plus bas que les 0,55 du handstand push-up : l'amplitude d'une pompe
    // planche est courte par nature, une fraction trop haute rejetterait des
    // répétitions bien réelles.
    minRangeRatio: 0.5,
    lockout: { target: 165, tolerance: 25 },
    peak: { target: 110, tolerance: 40 },
    hipSwing: { target: 6, tolerance: 18 },
    form: { target: 170, tolerance: 22 },
    protraction: { target: 0.6, tolerance: 0.2 },
    tempo: { target: 65, tolerance: 45 },
  },
  handstand_push_up: {
    driver: "elbowAngle",
    extendedValue: 175,
    flexedValue: 75,
    minRangeRatio: 0.55,
    // Rampe de 25 degrés, revenue à sa valeur d'origine après un
    // resserrement à 15 fondé sur un calcul faux de ma part : j'avais écrit
    // qu'à 25 un coude à 147 degrés gardait des points, alors qu'il y vaut
    // exactement zéro (172 - 25 = 147). Le garde-fou existait déjà.
    //
    // Les 7 échantillons tranchent dans le même sens : à 15, une prise à
    // 163 degrés tombe à 4,0 alors que l'œil la note 8,5 ; à 25 elle vaut
    // 6,6 et la note globale colle. Écart absolu moyen sur l'ensemble :
    // 0,44 à 15 contre 0,46 à 25, mais surtout un profil d'erreur bien plus
    // sain une fois combiné au plafond de faute majeure, qui n'a plus
    // besoin d'être déclenché à tort sur un simple manque d'extension.
    lockout: { target: 172, tolerance: 25 },
    peak: { target: 80, tolerance: 40 },
    hipSwing: { target: 8, tolerance: 20 },
    // Le critère qui manquait sur le HSPU : le corps doit rester tendu du
    // bassin aux pieds pendant toute la descente. Casser à la hanche pour
    // raccourcir la course est la triche classique, et une série entièrement
    // cassée passait inaperçue du contrôle, qui ne voit que les variations.
    //
    // RECALÉ SUR 6 ÉCHANTILLONS. Cible descendue de 178 à 170 degrés, rampe
    // inchangée. 178 décrit un corps parfaitement empilé, que ne produit
    // aucun HSPU réel : les six prises mesurent de 156 à 173 degrés alors que
    // l'œil les note toutes entre 8,5 et 10. La forme était systématiquement
    // le critère le plus bas, entre 3,2 et 8,9, et tirait la note vers le bas
    // sur des exécutions jugées bonnes. Écart absolu moyen entre grille et
    // notes humaines : 0,51 avant, 0,43 après, et les erreurs cessent d'être
    // toutes du même côté.
    //
    // Pas descendu plus bas, malgré un écart moyen qui continuait de baisser
    // jusqu'à 0,35 à 166 degrés : les six prises sont notées de 8,5 à 10, si
    // bien que minimiser l'écart sur cet échantillon revient à tout faire
    // tendre vers 10. À 170 une hanche à 150 degrés vaut encore 3,6 et une
    // hanche à 140 vaut 2,0 ; le critère garde des dents.
    form: { target: 170, tolerance: 15 },
    tempo: { target: 65, tolerance: 45 },
  },
};

export function isRepProgression(value: string): value is RepProgression {
  return value in REP_SCORING_GRID;
}
