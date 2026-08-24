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
  // Écart horizontal épaules/poignets, normalisé par la longueur du tronc
  // (0 = épaules au-dessus des poignets, plus c'est grand plus les épaules sont avancées)
  shoulderProtraction: number;
  // Écart du bassin par rapport à la ligne épaule-cheville, normalisé par la longueur du corps
  // (0 = bassin parfaitement aligné, plus c'est grand plus il y a du sag ou du pike)
  pelvisDeviation: number;
  // Signe de l'écart du bassin : positif = bassin plus bas que prévu (sag),
  // négatif = bassin plus haut que prévu (pike). Sert à choisir l'exercice correctif.
  pelvisSagSign: number;
};

// Moyenne des angles gauche/droite pour plus de robustesse à l'angle caméra
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
  const bodyLineAngleFromHorizontal = Math.abs(
    (Math.atan2(dy, dx) * 180) / Math.PI
  );

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

  return {
    elbowAngle: (leftElbowAngle + rightElbowAngle) / 2,
    hipAngle: (leftHipAngle + rightHipAngle) / 2,
    kneeAngle: (leftKneeAngle + rightKneeAngle) / 2,
    shoulderFlexionAngle: (leftShoulderFlexion + rightShoulderFlexion) / 2,
    bodyLineAngleFromHorizontal,
    shoulderProtraction,
    pelvisDeviation,
    pelvisSagSign,
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
  const threshold = options?.threshold ?? 0.004;
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
    shoulderProtraction: median(frames.map((f) => f.shoulderProtraction)),
    pelvisDeviation: median(frames.map((f) => f.pelvisDeviation)),
    pelvisSagSign: median(frames.map((f) => f.pelvisSagSign)),
  };
}
