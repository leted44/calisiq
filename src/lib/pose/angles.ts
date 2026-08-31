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

export function computeAngles(landmarks: NormalizedLandmark[]): PoseAngles {
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
  const pelvisSagSign = midHip.y - expectedHipY;

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

  return {
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
    shoulderProtraction,
    pelvisDeviation,
    pelvisSagSign,
    isInvertedPose,
    legOcclusionRisk,
  };
}

// Points du tronc/des membres, hors visage (0-10), utilisés pour détecter l'immobilité
const STABILITY_LANDMARK_INDICES = Array.from({ length: 22 }, (_, i) => i + 11);

function frameCenter(landmarks: NormalizedLandmark[]): Point {
  let sx = 0;
  let sy = 0;
  for (const i of STABILITY_LANDMARK_INDICES) {
    sx += landmarks[i].x;
    sy += landmarks[i].y;
  }
  const n = STABILITY_LANDMARK_INDICES.length;
  return { x: sx / n, y: sy / n };
}

function smooth(values: number[], windowSize = 5): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const slice = values.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export type HoldWindow = { start: number; end: number; detected: boolean };

// Trouve le plus long segment où le corps reste quasi immobile (le hold),
// en excluant la mise en place avant et la sortie de figure après.
export function detectHoldWindow(
  frames: NormalizedLandmark[][],
  options?: { threshold?: number; minFrames?: number }
): HoldWindow {
  // Relevé de 0.004 à 0.008 puis à 0.02 : un hold réel tremble souvent
  // beaucoup (manque de force, fatigue) sans que ce soit un vrai mouvement
  // vers/hors de la figure — l'ancien seuil classait ce tremblement comme
  // "non détecté" alors que la figure était bien tenue. Il y a une limite à
  // ce réglage : trop haut, on finit par inclure la mise en place ou la
  // sortie de figure dans le hold, ce qui fausserait les angles mesurés.
  const threshold = options?.threshold ?? 0.02;
  const minFrames = options?.minFrames ?? 15;

  if (frames.length === 0) return { start: 0, end: 0, detected: false };

  const centers = frames.map(frameCenter);
  const rawMotion = [0];
  for (let i = 1; i < centers.length; i++) {
    rawMotion.push(Math.hypot(centers[i].x - centers[i - 1].x, centers[i].y - centers[i - 1].y));
  }
  const motion = smooth(rawMotion);

  let bestStart = 0;
  let bestLength = 0;
  let currentStart = 0;

  for (let i = 0; i < motion.length; i++) {
    if (motion[i] > threshold) {
      currentStart = i + 1;
      continue;
    }
    const length = i - currentStart + 1;
    if (length > bestLength) {
      bestLength = length;
      bestStart = currentStart;
    }
  }

  if (bestLength < minFrames) {
    return { start: 0, end: frames.length - 1, detected: false };
  }

  return { start: bestStart, end: bestStart + bestLength - 1, detected: true };
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
    shoulderProtraction: median(frames.map((f) => f.shoulderProtraction)),
    pelvisDeviation: median(frames.map((f) => f.pelvisDeviation)),
    pelvisSagSign: median(frames.map((f) => f.pelvisSagSign)),
    isInvertedPose:
      frames.filter((f) => f.isInvertedPose).length >= frames.length / 2,
    legOcclusionRisk:
      frames.filter((f) => f.legOcclusionRisk).length >= frames.length / 2,
  };
}
