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
  bodyLineAngleFromHorizontal: number;
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

  const midShoulder = midpoint(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER]);
  const midHip = midpoint(landmarks[LEFT_HIP], landmarks[RIGHT_HIP]);

  const dx = midHip.x - midShoulder.x;
  const dy = midHip.y - midShoulder.y;
  const bodyLineAngleFromHorizontal = Math.abs(
    (Math.atan2(dy, dx) * 180) / Math.PI
  );

  return {
    elbowAngle: (leftElbowAngle + rightElbowAngle) / 2,
    hipAngle: (leftHipAngle + rightHipAngle) / 2,
    bodyLineAngleFromHorizontal,
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
    bodyLineAngleFromHorizontal: median(
      frames.map((f) => f.bodyLineAngleFromHorizontal)
    ),
  };
}
