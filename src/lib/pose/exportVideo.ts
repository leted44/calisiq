import { PoseLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import type { CriterionScore } from "./scoring";
import { getLandmarker } from "./runAnalysis";

// MP4 en priorité : format fiable pour republier sur Instagram/réseaux sociaux.
// WebM en repli pour les navigateurs qui ne savent pas encoder de MP4.
const CANDIDATE_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickSupportedMimeType(): string {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "video/webm";
}

const CRITERE_LABELS: Record<CriterionScore["critere"], string> = {
  shoulder_protraction: "Épaules",
  shoulder_flexion: "Épaules",
  pelvis_deviation: "Bassin",
  hip_angle: "Hanches",
  knee_angle: "Genoux",
  elbow_angle: "Coudes",
  body_line_angle: "Axe",
};

function scoreColor(score: number): string {
  if (score >= 8) return "#4ade80";
  if (score >= 6) return "#22d3ee";
  return "#fb923c";
}

function roundedRectPath(
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

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string
) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

// Bandeaux compacts en coin, pas des bandes pleine largeur : sur une vidéo
// portrait le corps occupe presque tout le cadre, un gros bandeau le
// masquerait ("effet rogné"). Tailles proportionnelles à une largeur de
// référence de 400px pour rester lisibles sur toutes les résolutions.
function drawHud(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  {
    figureLabel,
    elapsedSeconds,
    globalScoreValue,
    scores,
  }: {
    figureLabel: string;
    elapsedSeconds: number;
    globalScoreValue: number;
    scores: CriterionScore[];
  }
) {
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 400;
  const margin = 16 * scale;
  const radius = 12 * scale;

  // Badge haut-gauche : figure + timer
  const pillText = `${figureLabel} · ${elapsedSeconds.toFixed(1)}s`;
  ctx.font = `600 ${14 * scale}px sans-serif`;
  const pillPaddingX = 12 * scale;
  const pillHeight = 30 * scale;
  const textWidth = ctx.measureText(pillText).width;
  const pillWidth = textWidth + pillPaddingX * 2;

  fillRoundedRect(ctx, margin, margin, pillWidth, pillHeight, radius, "rgba(2,6,23,0.72)");
  ctx.fillStyle = "#22d3ee";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(pillText, margin + pillPaddingX, margin + pillHeight / 2);

  // Carte bas-gauche : score global + grille compacte des critères
  const cols = scores.length > 2 ? 2 : 1;
  const rows = Math.ceil(scores.length / cols);
  const rowHeight = 20 * scale;
  const headerHeight = 34 * scale;
  const cardPadding = 12 * scale;
  const cardWidth = Math.min(w - margin * 2, (cols === 2 ? 230 : 150) * scale);
  const cardHeight = headerHeight + rows * rowHeight + cardPadding * 2;
  const cardX = margin;
  const cardY = h - margin - cardHeight;

  fillRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, radius, "rgba(2,6,23,0.78)");

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `${10 * scale}px sans-serif`;
  ctx.fillText("SCORE GLOBAL", cardX + cardPadding, cardY + cardPadding + 9 * scale);

  ctx.fillStyle = scoreColor(globalScoreValue);
  ctx.font = `bold ${20 * scale}px sans-serif`;
  ctx.fillText(
    `${globalScoreValue.toFixed(1)}/10`,
    cardX + cardPadding,
    cardY + cardPadding + 30 * scale
  );

  const gridTop = cardY + headerHeight + cardPadding;
  const colWidth = (cardWidth - cardPadding * 2) / cols;

  scores.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = cardX + cardPadding + col * colWidth;
    const y = gridTop + row * rowHeight + 12 * scale;

    ctx.textAlign = "left";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `${11 * scale}px sans-serif`;
    ctx.fillText(CRITERE_LABELS[s.critere], x, y);

    ctx.textAlign = "right";
    ctx.fillStyle = scoreColor(s.score);
    ctx.font = `600 ${11 * scale}px sans-serif`;
    ctx.fillText(s.score.toFixed(1), x + colWidth - 6 * scale, y);
  });
}

export async function recordAnnotatedVideo({
  video,
  canvas,
  rangeStart,
  rangeEnd,
  figureLabel,
  globalScoreValue,
  scores,
  onProgress,
}: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  rangeStart: number;
  rangeEnd: number;
  figureLabel: string;
  globalScoreValue: number;
  scores: CriterionScore[];
  onProgress?: (percent: number) => void;
}): Promise<Blob> {
  const landmarker = await getLandmarker();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context2d = canvas.getContext("2d");
  if (!context2d) throw new Error("Impossible d'initialiser le canvas d'export.");
  const ctx: CanvasRenderingContext2D = context2d;
  const drawingUtils = new DrawingUtils(ctx);

  const mimeType = pickSupportedMimeType();
  // ~9 bits/pixel/frame à 30fps : nettement au-dessus du bitrate par défaut
  // du navigateur, pour un rendu net et publiable plutôt que compressé.
  const videoBitsPerSecond = Math.min(
    25_000_000,
    Math.max(6_000_000, Math.round(canvas.width * canvas.height * 9))
  );
  const canvasStream = canvas.captureStream(30);
  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e) => reject(e);
  });

  video.currentTime = rangeStart;
  await video.play();
  recorder.start();

  await new Promise<void>((resolve) => {
    function loop() {
      if (video.paused || video.ended || video.currentTime >= rangeEnd) {
        video.pause();
        resolve();
        return;
      }

      const elapsed = video.currentTime - rangeStart;
      onProgress?.(Math.min(100, Math.round((elapsed / (rangeEnd - rangeStart)) * 100)));

      const result = landmarker.detectForVideo(video, performance.now());

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      for (const landmarks of result.landmarks) {
        drawingUtils.drawLandmarks(landmarks, { radius: 4, color: "#22d3ee" });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: "#22d3ee",
          lineWidth: 3,
        });
      }

      drawHud(ctx, canvas, {
        figureLabel,
        elapsedSeconds: elapsed,
        globalScoreValue,
        scores,
      });

      requestAnimationFrame(loop);
    }
    loop();
  });

  recorder.stop();
  video.pause();
  return recorded;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
