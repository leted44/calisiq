import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { PoseAngles } from "./angles";

const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;

function mid(a: NormalizedLandmark, b: NormalizedLandmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
  scale: number
) {
  ctx.font = `600 ${13 * scale}px sans-serif`;
  const paddingX = 6 * scale;
  const textWidth = ctx.measureText(text).width;
  const w = textWidth + paddingX * 2;
  const h = 18 * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;

  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(2,6,23,0.78)";
  ctx.fill();

  ctx.fillStyle = "#22d3ee";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 0.5 * scale);
}

// Repères d'angle directement sur le squelette (coude, hanche, genou) — pas
// juste un panneau à côté, pour montrer concrètement à quel endroit du
// corps chaque chiffre correspond.
export function drawAngleLabels(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  angles: PoseAngles
) {
  const scale = canvas.width / 500;
  const toPixel = (p: { x: number; y: number }) => ({
    x: p.x * canvas.width,
    y: p.y * canvas.height,
  });

  const elbow = toPixel(mid(landmarks[LEFT_ELBOW], landmarks[RIGHT_ELBOW]));
  const hip = toPixel(mid(landmarks[LEFT_HIP], landmarks[RIGHT_HIP]));
  const knee = toPixel(mid(landmarks[LEFT_KNEE], landmarks[RIGHT_KNEE]));

  // Décale chaque étiquette légèrement du point exact pour ne pas cacher
  // le repère du squelette lui-même.
  drawPill(ctx, elbow.x, elbow.y - 16 * scale, `${angles.elbowAngle.toFixed(0)}°`, scale);
  drawPill(ctx, hip.x, hip.y - 16 * scale, `${angles.hipAngle.toFixed(0)}°`, scale);
  drawPill(ctx, knee.x, knee.y - 16 * scale, `${angles.kneeAngle.toFixed(0)}°`, scale);
}
