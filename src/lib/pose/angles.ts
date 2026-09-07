import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Indices standards du modèle MediaPipe Pose (33 points)
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

type Point = { x: number; y: number };
type Point3 = { x: number; y: number; z: number };

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Angle en degrés au point b, formé par les segments b->a et b->c
function angleAt(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Angle en degrés au point b, calculé dans l'espace 3D.
//
// POURQUOI UNE SECONDE VERSION
//
// Les angles 2D sont mesurés sur l'image projetée : ils dépendent donc de
// l'endroit où est posée la caméra. Le cas est net sur un handstand push-up
// filmé de face — épaule, hanche et genou se projettent presque sur une même
// verticale, et trois points quasi alignés donnent un angle hypersensible au
// moindre pixel de bruit. Le critère de contrôle, qui mesure justement la
// stabilité de la hanche, y mesurait le bruit de détection avant l'élan.
//
// MediaPipe fournit aussi des coordonnées métriques 3D (worldLandmarks),
// centrées sur le bassin. Un angle articulaire calculé dessus ne dépend plus
// de l'orientation de la caméra.
//
// CE QUE ÇA NE RÉSOUT PAS
//
// La profondeur est estimée par le modèle, c'est sa sortie la moins fiable,
// et les corps inversés sont rares dans ses données d'entraînement. Et les
// critères d'orientation par rapport à la gravité (ligne de corps, angle du
// tronc) doivent RESTER en 2D : ils ont besoin de la verticale de l'image,
// que le repère 3D centré bassin ne connaît pas.
function angleAt3(a: Point3, b: Point3, c: Point3): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export type PoseAngles = {
  elbowAngle: number;
  hipAngle: number;
  kneeAngle: number;
  // Angle hanche-épaule-poignet : ouverture d'épaule (utilisé pour le
  // handstand — bras bien overhead, "oreilles cachées par les épaules")
  shoulderFlexionAngle: number;
  bodyLineAngleFromHorizontal: number;
  // Angle du TRONC seul (épaule -> hanche) par rapport à l'horizontale.
  // Contrairement à bodyLineAngleFromHorizontal, qui va jusqu'aux
  // chevilles, celui-ci garde un sens quelle que soit la position des
  // jambes : indispensable pour les figures asymétriques (single leg) et
  // repliées (tuck), où la ligne épaule-cheville ne veut rien dire.
  torsoAngleFromHorizontal: number;
  // Angle du genou de la jambe la PLUS TENDUE, et angle de hanche du même
  // côté. Les valeurs moyennées ci-dessus supposent les deux jambes dans
  // la même position ; sur une figure à une jambe, elles donnent une
  // moyenne entre une jambe tendue et une repliée, qui ne correspond à
  // aucune des deux. Ces champs isolent la jambe qui porte la difficulté.
  straightestKneeAngle: number;
  straightestLegHipAngle: number;
  // Genou de l'AUTRE jambe (la moins tendue). Indispensable pour les
  // figures à une jambe : sans lui, une figure où les deux jambes sont
  // tendues (full front lever) passerait pour une single leg parfaite,
  // puisque la jambe la plus tendue y est irréprochable et que rien ne
  // vérifierait que la seconde aurait dû être repliée.
  bentKneeAngle: number;
  // Écart horizontal épaules/poignets, normalisé par la longueur du tronc
  // (0 = épaules au-dessus des poignets, plus c'est grand plus les épaules sont avancées)
  shoulderProtraction: number;
  // Écart du bassin par rapport à la ligne épaule-cheville, normalisé par la longueur du corps
  // (0 = bassin parfaitement aligné, plus c'est grand plus il y a du sag ou du pike)
  pelvisDeviation: number;
  // Signe de l'écart du bassin : positif = bassin plus bas que prévu (sag),
  // négatif = bassin plus haut que prévu (pike). Sert à choisir l'exercice correctif.
  pelvisSagSign: number;
  // Détecte si le corps est réellement inversé (mains au sol, pieds en
  // l'air) plutôt que simplement vertical — une personne debout donne
  // aussi un axe du corps proche de 90°, ce qui la rendrait indiscernable
  // d'un handstand sans ce contrôle. En image, y augmente vers le bas :
  // dans un vrai handstand les poignets sont plus bas que les chevilles
  // ET les épaules plus basses que les hanches (corps retourné) ; c'est
  // l'inverse pour quelqu'un debout.
  isInvertedPose: boolean;
  // Risque qu'une jambe soit mal détectée en straddle (jambes écartées) :
  // si la caméra filme presque de profil par rapport au plan d'écartement,
  // les deux jambes se superposent dans l'image et MediaPipe perd le
  // suivi d'une des deux (faible visibility) ou les place quasi au même
  // endroit — les angles genou/axe du corps deviennent alors peu fiables.
  legOcclusionRisk: boolean;
  // Mêmes articulations que ci-dessus, mais calculées en 3D et donc
  // indépendantes de l'angle de caméra. Retombent sur la valeur 2D quand les
  // coordonnées 3D ne sont pas fournies, pour qu'aucun appelant ne casse.
  // Seuls les exercices à répétition les utilisent : les figures statiques
  // ont été calibrées sur les valeurs 2D, changer d'unité invaliderait ce
  // travail sans que rien ne le signale.
  elbowAngle3d: number;
  hipAngle3d: number;
  kneeAngle3d: number;
  // Part de la largeur d'épaules réellement visible dans le plan de l'image,
  // entre 0 et 1. C'est le sinus de l'angle entre l'axe des épaules et l'axe
  // de la caméra : 0 = profil parfait (une épaule cache l'autre), 1 = plein
  // face. La plupart des mouvements à répétition se jugent dans le plan
  // sagittal et veulent donc une valeur basse. Vaut NaN sans coordonnées 3D.
  shoulderFacing: number;
};

// Visibilité moyenne des points utilisés pour un angle, sert de poids de
// confiance pour ce côté (gauche/droite).
function sideConfidence(...points: NormalizedLandmark[]): number {
  return points.reduce((sum, p) => sum + p.visibility, 0) / points.length;
}

// Moyenne pondérée par la confiance de chaque côté plutôt qu'une moyenne
// 50/50 aveugle : en straddle notamment, une jambe mal suivie (caméra trop
// alignée avec l'écartement) a une visibility basse — sans pondération,
// son angle (souvent aberrant) pèserait autant que celui de la jambe bien
// suivie et fausserait silencieusement le résultat.
function weightedAverage(
  aValue: number,
  aWeight: number,
  bValue: number,
  bWeight: number
): number {
  const total = aWeight + bWeight;
  if (total === 0) return (aValue + bValue) / 2;
  return (aValue * aWeight + bValue * bWeight) / total;
}

export function computeAngles(
  landmarks: NormalizedLandmark[],
  // Coordonnées métriques 3D du même corps, origine au bassin. Facultatives :
  // un appelant qui ne les a pas obtient les mêmes angles qu'avant.
  worldLandmarks?: NormalizedLandmark[]
): PoseAngles {
  const leftElbowAngle = angleAt(
    landmarks[LEFT_SHOULDER],
    landmarks[LEFT_ELBOW],
    landmarks[LEFT_WRIST]
  );
  const rightElbowAngle = angleAt(
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_ELBOW],
    landmarks[RIGHT_WRIST]
  );
  const leftElbowConfidence = sideConfidence(
    landmarks[LEFT_SHOULDER],
    landmarks[LEFT_ELBOW],
    landmarks[LEFT_WRIST]
  );
  const rightElbowConfidence = sideConfidence(
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_ELBOW],
    landmarks[RIGHT_WRIST]
  );

  const leftHipAngle = angleAt(
    landmarks[LEFT_SHOULDER],
    landmarks[LEFT_HIP],
    landmarks[LEFT_KNEE]
  );
  const rightHipAngle = angleAt(
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_HIP],
    landmarks[RIGHT_KNEE]
  );
  const leftHipConfidence = sideConfidence(
    landmarks[LEFT_SHOULDER],
    landmarks[LEFT_HIP],
    landmarks[LEFT_KNEE]
  );
  const rightHipConfidence = sideConfidence(
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_HIP],
    landmarks[RIGHT_KNEE]
  );

  const leftKneeAngle = angleAt(
    landmarks[LEFT_HIP],
    landmarks[LEFT_KNEE],
    landmarks[LEFT_ANKLE]
  );
  const rightKneeAngle = angleAt(
    landmarks[RIGHT_HIP],
    landmarks[RIGHT_KNEE],
    landmarks[RIGHT_ANKLE]
  );
  const leftKneeConfidence = sideConfidence(
    landmarks[LEFT_HIP],
    landmarks[LEFT_KNEE],
    landmarks[LEFT_ANKLE]
  );
  const rightKneeConfidence = sideConfidence(
    landmarks[RIGHT_HIP],
    landmarks[RIGHT_KNEE],
    landmarks[RIGHT_ANKLE]
  );

  const leftShoulderFlexion = angleAt(
    landmarks[LEFT_HIP],
    landmarks[LEFT_SHOULDER],
    landmarks[LEFT_WRIST]
  );
  const rightShoulderFlexion = angleAt(
    landmarks[RIGHT_HIP],
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_WRIST]
  );
  const leftShoulderFlexionConfidence = sideConfidence(
    landmarks[LEFT_HIP],
    landmarks[LEFT_SHOULDER],
    landmarks[LEFT_WRIST]
  );
  const rightShoulderFlexionConfidence = sideConfidence(
    landmarks[RIGHT_HIP],
    landmarks[RIGHT_SHOULDER],
    landmarks[RIGHT_WRIST]
  );

  const midShoulder = midpoint(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]);
  const midHip = midpoint(landmarks[LEFT_HIP], landmarks[RIGHT_HIP]);
  const midWrist = midpoint(landmarks[LEFT_WRIST], landmarks[RIGHT_WRIST]);
  const midAnkle = midpoint(landmarks[LEFT_ANKLE], landmarks[RIGHT_ANKLE]);

  // Épaule -> cheville (tout le corps), pas épaule -> hanche : une base plus
  // longue est moins sensible au bruit de détection sur un seul point, et
  // représente mieux l'axe global du corps. N'a de sens que jambes tendues
  // (straddle, full planche, handstand) — pas utilisé en tuck où les
  // chevilles sont repliées près du buste.
  const dx = midAnkle.x - midShoulder.x;
  const dy = midAnkle.y - midShoulder.y;
  const rawAngle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI); // 0-180
  // Replie sur [0, 90] : sans ça, un corps parfaitement horizontal donne 0°
  // s'il pointe vers la droite de l'image mais 180° s'il pointe vers la
  // gauche — un artefact du sens de la caméra, pas de la posture. 0 = plat,
  // 90 = vertical, peu importe le sens dans lequel la figure est orientée.
  const bodyLineAngleFromHorizontal = Math.min(rawAngle, 180 - rawAngle);

  // Même repliement sur [0, 90] pour le tronc seul (épaule -> hanche).
  const torsoRaw = Math.abs(
    (Math.atan2(midHip.y - midShoulder.y, midHip.x - midShoulder.x) * 180) /
      Math.PI
  );
  const torsoAngleFromHorizontal = Math.min(torsoRaw, 180 - torsoRaw);

  // Jambe la plus tendue = genou le plus proche de 180°. Sur une figure
  // symétrique les deux côtés se valent et le choix est sans conséquence ;
  // sur une figure à une jambe, c'est la jambe tendue qui porte la
  // difficulté et qu'il faut noter.
  const leftIsStraighter = leftKneeAngle >= rightKneeAngle;
  const straightestKneeAngle = leftIsStraighter ? leftKneeAngle : rightKneeAngle;
  const straightestLegHipAngle = leftIsStraighter ? leftHipAngle : rightHipAngle;
  const bentKneeAngle = leftIsStraighter ? rightKneeAngle : leftKneeAngle;

  const torsoLength = Math.hypot(
    midHip.x - midShoulder.x,
    midHip.y - midShoulder.y
  );
  const shoulderProtraction =
    torsoLength === 0
      ? 0
      : Math.abs(midShoulder.x - midWrist.x) / torsoLength;

  // Distance du bassin à la droite épaule-cheville (mesure du sag/pike),
  // normalisée par la longueur épaule-cheville
  const bodyLength = Math.hypot(
    midAnkle.x - midShoulder.x,
    midAnkle.y - midShoulder.y
  );
  const crossProduct =
    (midAnkle.x - midShoulder.x) * (midShoulder.y - midHip.y) -
    (midShoulder.x - midHip.x) * (midAnkle.y - midShoulder.y);
  const pelvisDeviation =
    bodyLength === 0 ? 0 : Math.abs(crossProduct) / bodyLength / bodyLength;

  // Position attendue du bassin par interpolation linéaire épaule->cheville,
  // comparée à sa position réelle (y augmente vers le bas de l'image)
  const t =
    midAnkle.x === midShoulder.x
      ? 0.5
      : (midHip.x - midShoulder.x) / (midAnkle.x - midShoulder.x);
  const expectedHipY = midShoulder.y + t * (midAnkle.y - midShoulder.y);
  // Rapporté à la longueur du corps, comme pelvisDeviation juste au-dessus.
  // Brut, l'écart s'exprimait en fraction de la hauteur d'image : la même
  // faute valait deux fois plus filmée de près que de loin. Tant que la
  // valeur ne servait qu'à lire un signe, ça n'avait pas d'importance ; elle
  // est maintenant notée, donc elle doit être comparable d'une vidéo à
  // l'autre. Diviser par une longueur positive ne change aucun signe, donc
  // les usages existants sont intacts.
  const pelvisSagSign =
    bodyLength === 0 ? 0 : (midHip.y - expectedHipY) / bodyLength;

  const isInvertedPose = midWrist.y > midAnkle.y && midShoulder.y > midHip.y;

  // Visibilité moyenne genou+cheville de chaque côté : un côté sous le
  // seuil signifie que MediaPipe n'arrive pas à suivre correctement cette
  // jambe (souvent la jambe la plus éloignée de la caméra en straddle).
  const VISIBILITY_THRESHOLD = 0.5;
  const leftLegVisibility =
    (landmarks[LEFT_KNEE].visibility + landmarks[LEFT_ANKLE].visibility) / 2;
  const rightLegVisibility =
    (landmarks[RIGHT_KNEE].visibility + landmarks[RIGHT_ANKLE].visibility) / 2;
  const lowVisibilityLeg =
    leftLegVisibility < VISIBILITY_THRESHOLD || rightLegVisibility < VISIBILITY_THRESHOLD;

  // Écart horizontal entre les deux chevilles, normalisé par la longueur
  // du corps (épaule-cheville) pour rester valable quel que soit le zoom.
  // Des jambes vraiment écartées (straddle) doivent projeter un écart
  // net dans l'image ; un écart trop faible trahit des jambes superposées
  // à l'écran (caméra alignée avec le plan d'écartement), même si les
  // deux points sont individuellement bien détectés.
  const ankleSeparation =
    bodyLength === 0
      ? 1
      : Math.abs(landmarks[LEFT_ANKLE].x - landmarks[RIGHT_ANKLE].x) / bodyLength;
  const legsTooClose = ankleSeparation < 0.15;

  const legOcclusionRisk = lowVisibilityLeg || legsTooClose;

  // --- Mesures 3D ---
  //
  // Moyennées à 50/50 plutôt que pondérées par la visibility : celle-ci
  // décrit la fiabilité du point DANS L'IMAGE, or c'est précisément ce dont
  // la mesure 3D s'affranchit. Une épaule cachée par l'autre en vue de profil
  // a une visibility basse alors que sa position 3D reste correcte.
  const w = worldLandmarks;
  const mean3 = (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => {
    if (!w) return NaN;
    return (
      (angleAt3(w[a], w[b], w[c]) + angleAt3(w[d], w[e], w[f])) / 2
    );
  };
  const elbowAngle3d = mean3(
    LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST,
    RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST
  );
  const hipAngle3d = mean3(
    LEFT_SHOULDER, LEFT_HIP, LEFT_KNEE,
    RIGHT_SHOULDER, RIGHT_HIP, RIGHT_KNEE
  );
  const kneeAngle3d = mean3(
    LEFT_HIP, LEFT_KNEE, LEFT_ANKLE,
    RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE
  );

  // Orientation de la caméra vis-à-vis du corps. Le rapport entre la largeur
  // d'épaules vue dans le plan de l'image et sa largeur réelle en 3D ne
  // dépend ni de la résolution, ni du zoom, ni du format de la vidéo, parce
  // que les deux termes sont métriques et issus du même repère. Une mesure
  // en pixels normalisés aurait été faussée par le format de l'image, où un
  // écart horizontal et un écart vertical ne valent pas la même distance.
  let shoulderFacing = NaN;
  if (w) {
    const dx = w[LEFT_SHOULDER].x - w[RIGHT_SHOULDER].x;
    const dy = w[LEFT_SHOULDER].y - w[RIGHT_SHOULDER].y;
    const dz = w[LEFT_SHOULDER].z - w[RIGHT_SHOULDER].z;
    const full = Math.hypot(dx, dy, dz);
    if (full > 0) shoulderFacing = Math.hypot(dx, dy) / full;
  }

  return {
    elbowAngle3d: Number.isFinite(elbowAngle3d) ? elbowAngle3d : NaN,
    hipAngle3d,
    kneeAngle3d,
    shoulderFacing,
    elbowAngle: weightedAverage(
      leftElbowAngle,
      leftElbowConfidence,
      rightElbowAngle,
      rightElbowConfidence
    ),
    hipAngle: weightedAverage(leftHipAngle, leftHipConfidence, rightHipAngle, rightHipConfidence),
    kneeAngle: weightedAverage(
      leftKneeAngle,
      leftKneeConfidence,
      rightKneeAngle,
      rightKneeConfidence
    ),
    shoulderFlexionAngle: weightedAverage(
      leftShoulderFlexion,
      leftShoulderFlexionConfidence,
      rightShoulderFlexion,
      rightShoulderFlexionConfidence
    ),
    bodyLineAngleFromHorizontal,
    torsoAngleFromHorizontal,
    straightestKneeAngle,
    straightestLegHipAngle,
    bentKneeAngle,
    shoulderProtraction,
    pelvisDeviation,
    pelvisSagSign,
    isInvertedPose,
    legOcclusionRisk,
  };
}

// Points du tronc/des membres, hors visage (0-10), utilisés pour détecter l'immobilité
const STABILITY_LANDMARK_INDICES = Array.from({ length: 22 }, (_, i) => i + 11);

// Pose ramenée dans son propre repère : centrée sur son barycentre, puis
// divisée par son étalement.
//
// LA CAMÉRA N'EST PAS UNE RÉFÉRENCE FIXE
//
// La détection d'immobilité suivait le barycentre du corps DANS L'IMAGE.
// Quand quelqu'un filme à main levée, le corps traverse l'image sans que la
// personne bouge : chaque image dépassait le seuil de mouvement, aucun
// segment stable n'était trouvé, et le chrono restait vide alors que la
// figure était tenue. C'est le cas le plus courant en handstand, où l'on se
// fait presque toujours filmer par quelqu'un d'autre.
//
// Recentrer annule ce déplacement d'ensemble. Diviser par l'étalement annule
// le zoom et la distance de la caméra, qui faisaient qu'une même oscillation
// comptait double filmée de près et pour presque rien filmée de loin — deux
// vidéos de la même tenue n'étaient donc pas jugées avec la même exigence.
//
// Ce qui reste après ces deux opérations est la déformation de la
// silhouette, seul mouvement qui appartienne vraiment à la personne filmée.
function normalizedPose(landmarks: NormalizedLandmark[]): Point[] {
  const points = STABILITY_LANDMARK_INDICES.map((i) => landmarks[i]);
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const centre = { x: sx / points.length, y: sy / points.length };

  const centres = points.map((p) => ({
    x: p.x - centre.x,
    y: p.y - centre.y,
  }));

  let carres = 0;
  for (const p of centres) carres += p.x * p.x + p.y * p.y;
  const etalement = Math.sqrt(carres / centres.length);
  // Corps réduit à un point : division par zéro, donc des NaN qui
  // contamineraient toute la recherche de segment. Le cas ne se produit que
  // sur une détection dégénérée, où l'échelle n'a de toute façon aucun sens.
  if (etalement === 0) return centres;

  return centres.map((p) => ({ x: p.x / etalement, y: p.y / etalement }));
}

// Déformation moyenne de la silhouette entre deux poses normalisées, en
// largeurs de silhouette.
function poseShift(a: Point[], b: Point[]): number {
  let somme = 0;
  for (let i = 0; i < a.length; i++) {
    somme += Math.hypot(b[i].x - a[i].x, b[i].y - a[i].y);
  }
  return somme / a.length;
}

function smooth(values: number[], windowSize = 5): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const slice = values.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export type HoldWindow = {
  start: number;
  end: number;
  detected: boolean;
  /**
   * Vrai quand la fenêtre retenue correspond bien à la figure demandée.
   *
   * Faux lorsqu'aucun segment ne ressemblait à la figure et qu'il a fallu
   * retomber sur la simple immobilité. La mesure existe alors quand même,
   * mais elle porte sur un segment dont rien ne garantit qu'il montre la
   * position visée : l'appelant doit le dire.
   */
  matchedFigure: boolean;
};

// Trouve le plus long segment où le corps reste quasi immobile (le hold),
// en excluant la mise en place avant et la sortie de figure après.
//
// L'IMMOBILITÉ NE SUFFIT PAS
//
// C'était le seul critère, et il produisait des mesures fausses. Quelqu'un
// suspendu à une barre avant d'entamer son front lever est parfaitement
// immobile : ce segment gagnait le concours de stabilité, le chrono partait
// avant le début de la figure, et surtout la médiane des angles se calculait
// en partie sur une suspension. Le défaut se voyait au chrono, il touchait
// aussi la note.
//
// D'où le second critère : le segment doit RESSEMBLER à la figure. Le
// prédicat est fourni par l'appelant, seul à connaître la grille de notation.
export function detectHoldWindow(
  frames: NormalizedLandmark[][],
  options?: {
    threshold?: number;
    minFrames?: number;
    /**
     * Instants des images, en secondes. Permet de mesurer une vitesse plutôt
     * qu'un déplacement par image. Absents, un rythme régulier est supposé.
     */
    times?: number[];
    /** Vrai si l'image montre plausiblement la figure demandée. */
    isInFigure?: (index: number) => boolean;
  }
): HoldWindow {
  // Seuil en largeurs de silhouette par seconde (voir normalizedPose).
  //
  // Le réglage historique (0.004 puis 0.008 puis 0.02) portait sur le
  // déplacement du corps dans l'image, une grandeur que la mesure n'utilise
  // plus : il a fallu le reprendre à zéro. Valeurs obtenues en simulant un
  // corps qui pivote sur ses appuis, à 30 images par seconde :
  //
  //   tenue calme (±1.5°, 1 Hz)        0.09 à 0.14
  //   tenue très instable (±6°, 1.5 Hz) 0.55, pointes à 0.86
  //   sortie lente (90° en 1.5 s)       0.92
  //   entrée en figure (90° en 0.6 s)   2.31
  //
  // 0.9 passe donc entre la tenue la plus instable et la sortie la plus
  // lente. La marge côté tremblement est volontairement large : un hold qui
  // tremble beaucoup (manque de force, fatigue) doit rester détecté, et
  // c'est le filtre de forme ci-dessous, pas ce seuil, qui empêche d'avaler
  // la mise en place.
  //
  // À revalider sur les vidéos réelles : ces chiffres viennent d'un modèle
  // géométrique, pas encore d'un lot d'échantillons notés.
  const threshold = options?.threshold ?? 0.9;
  const minFrames = options?.minFrames ?? 15;
  // Repli quand les instants ne sont pas fournis : le déplacement par image
  // est ramené à une vitesse en supposant ce rythme.
  const IMAGES_PAR_SECONDE_SUPPOSE = 30;

  if (frames.length === 0)
    return { start: 0, end: 0, detected: false, matchedFigure: false };

  const poses = frames.map(normalizedPose);
  const rawMotion = [0];
  for (let i = 1; i < poses.length; i++) {
    const deformation = poseShift(poses[i - 1], poses[i]);
    // Vitesse plutôt que déplacement par image : les images d'analyse ne sont
    // pas capturées à intervalle régulier, le décodage suit ce que le
    // téléphone arrive à fournir. Sans cette division, un simple ralenti du
    // décodage double le mouvement mesuré et coupe un hold pourtant tenu.
    const dt = options?.times
      ? options.times[i] - options.times[i - 1]
      : 0;
    rawMotion.push(
      dt > 0 ? deformation / dt : deformation * IMAGES_PAR_SECONDE_SUPPOSE
    );
  }
  const motion = smooth(rawMotion);

  // Recherche du plus long segment stable, avec ou sans filtre de forme. Le
  // même parcours sert deux fois : une passe filtrée, et une passe de repli
  // si la première ne trouve rien.
  function plusLongSegment(filtre?: (index: number) => boolean) {
    let bestStart = 0;
    let bestLength = 0;
    let currentStart = 0;

    for (let i = 0; i < motion.length; i++) {
      // Une image trop mobile OU qui ne montre pas la figure coupe le segment.
      if (motion[i] > threshold || (filtre && !filtre(i))) {
        currentStart = i + 1;
        continue;
      }
      const length = i - currentStart + 1;
      if (length > bestLength) {
        bestLength = length;
        bestStart = currentStart;
      }
    }
    return { bestStart, bestLength };
  }

  const filtre = plusLongSegment(options?.isInFigure);
  if (filtre.bestLength >= minFrames) {
    return {
      start: filtre.bestStart,
      end: filtre.bestStart + filtre.bestLength - 1,
      detected: true,
      matchedFigure: true,
    };
  }

  // Repli : aucun segment ne ressemblait à la figure assez longtemps. Plutôt
  // que de ne rien mesurer, on reprend le plus long segment immobile — c'est
  // l'ancien comportement — en signalant que la correspondance n'est pas
  // établie.
  const brut = plusLongSegment();
  if (brut.bestLength < minFrames) {
    return {
      start: 0,
      end: frames.length - 1,
      detected: false,
      matchedFigure: false,
    };
  }

  return {
    start: brut.bestStart,
    end: brut.bestStart + brut.bestLength - 1,
    detected: true,
    matchedFigure: options?.isInFigure === undefined,
  };
}

export function medianAngles(frames: PoseAngles[]): PoseAngles {
  function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return {
    elbowAngle: median(frames.map((f) => f.elbowAngle)),
    hipAngle: median(frames.map((f) => f.hipAngle)),
    kneeAngle: median(frames.map((f) => f.kneeAngle)),
    shoulderFlexionAngle: median(frames.map((f) => f.shoulderFlexionAngle)),
    bodyLineAngleFromHorizontal: median(
      frames.map((f) => f.bodyLineAngleFromHorizontal)
    ),
    torsoAngleFromHorizontal: median(
      frames.map((f) => f.torsoAngleFromHorizontal)
    ),
    straightestKneeAngle: median(frames.map((f) => f.straightestKneeAngle)),
    straightestLegHipAngle: median(frames.map((f) => f.straightestLegHipAngle)),
    bentKneeAngle: median(frames.map((f) => f.bentKneeAngle)),
    shoulderProtraction: median(frames.map((f) => f.shoulderProtraction)),
    pelvisDeviation: median(frames.map((f) => f.pelvisDeviation)),
    pelvisSagSign: median(frames.map((f) => f.pelvisSagSign)),
    isInvertedPose:
      frames.filter((f) => f.isInvertedPose).length >= frames.length / 2,
    legOcclusionRisk:
      frames.filter((f) => f.legOcclusionRisk).length >= frames.length / 2,
    elbowAngle3d: median(frames.map((f) => f.elbowAngle3d)),
    hipAngle3d: median(frames.map((f) => f.hipAngle3d)),
    kneeAngle3d: median(frames.map((f) => f.kneeAngle3d)),
    shoulderFacing: median(frames.map((f) => f.shoulderFacing)),
  };
}
