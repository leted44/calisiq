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
