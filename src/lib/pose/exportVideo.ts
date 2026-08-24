import { PoseLandmarker, DrawingUtils } from "@mediapipe/tasks-vision";
import type { CriterionScore } from "./scoring";
import { getLandmarker } from "./runAnalysis";

const CANDIDATE_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
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
  pelvis_deviation: "Bassin",
  hip_angle: "Hanches",
  elbow_angle: "Coudes",
};

function scoreColor(score: number): string {
  if (score >= 8) return "#4ade80";
  if (score >= 6) return "#22d3ee";
  return "#fb923c";
}

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
  const unit = w / 24;

  // Bandeau haut : dégradé + nom de la figure
  const topGradient = ctx.createLinearGradient(0, 0, 0, unit * 6);
  topGradient.addColorStop(0, "rgba(2,6,23,0.85)");
  topGradient.addColorStop(1, "rgba(2,6,23,0)");
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, w, unit * 6);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${unit * 1.15}px sans-serif`;
  ctx.fillText(figureLabel, w / 2, unit * 1.6);

  ctx.fillStyle = "#94a3b8";
  ctx.font = `${unit * 0.5}px sans-serif`;
  ctx.fillText("TEMPS DE HOLD", w / 2, unit * 2.5);

  ctx.fillStyle = "#22d3ee";
  ctx.font = `bold ${unit * 1.8}px sans-serif`;
  ctx.shadowColor = "rgba(34,211,238,0.7)";
  ctx.shadowBlur = unit * 0.6;
  ctx.fillText(`${elapsedSeconds.toFixed(1)}s`, w / 2, unit * 4.6);
  ctx.shadowBlur = 0;

  // Bandeau bas : score + barres par critère
  const panelHeight = unit * (3.6 + scores.length * 1.7);
  const panelTop = h - panelHeight;
  const bottomGradient = ctx.createLinearGradient(0, panelTop, 0, h);
  bottomGradient.addColorStop(0, "rgba(2,6,23,0)");
  bottomGradient.addColorStop(0.3, "rgba(2,6,23,0.88)");
  bottomGradient.addColorStop(1, "rgba(2,6,23,0.88)");
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, panelTop, w, panelHeight);

  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `${unit * 0.5}px sans-serif`;
  ctx.fillText("SCORE GLOBAL", unit * 0.8, panelTop + unit * 1.3);

  ctx.textAlign = "right";
  ctx.fillStyle = scoreColor(globalScoreValue);
  ctx.font = `bold ${unit * 1.6}px sans-serif`;
  ctx.fillText(`${globalScoreValue.toFixed(1)}/10`, w - unit * 0.8, panelTop + unit * 2.1);

  let y = panelTop + unit * 3.1;
  for (const s of scores) {
    const barX = unit * 0.8;
    const barW = w - unit * 1.6;
    const barH = unit * 0.5;

    ctx.textAlign = "left";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = `${unit * 0.55}px sans-serif`;
    ctx.fillText(CRITERE_LABELS[s.critere], barX, y);

    ctx.textAlign = "right";
    ctx.fillStyle = scoreColor(s.score);
    ctx.fillText(`${s.score.toFixed(1)}`, barX + barW, y);

    const barY = y + unit * 0.25;
    ctx.fillStyle = "rgba(148,163,184,0.25)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = scoreColor(s.score);
    ctx.fillRect(barX, barY, barW * Math.min(1, s.score / 10), barH);

    y += unit * 1.7;
  }
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
  const canvasStream = canvas.captureStream(30);
  const recorder = new MediaRecorder(canvasStream, { mimeType });
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
