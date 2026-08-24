import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  computeAngles,
  medianAngles,
  detectHoldWindow,
  type PoseAngles,
  type HoldWindow,
} from "./angles";
import { scoreAngles, globalScore, type CriterionScore } from "./scoring";
import {
  pickWeakestCriterion,
  recommendationsFor,
  type Recommendation,
} from "./recommendations";
import type { Progression } from "./grid";

let sharedLandmarkerPromise: Promise<PoseLandmarker> | null = null;

function getLandmarker() {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    ).then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      })
    );
  }
  return sharedLandmarkerPromise;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    function onSeeked() {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    }
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

export type PoseAnalysisResult =
  | {
      ok: true;
      framesAnalyzed: number;
      detectionRate: number;
      warning: string | null;
      holdWindow: HoldWindow;
      summaryAngles: PoseAngles;
      scores: CriterionScore[];
      globalScoreValue: number;
      recommendations: Recommendation[];
      representativeFrameDataUrl: string | null;
    }
  | {
      ok: false;
      framesAnalyzed: number;
      detectionRate: number;
      warning: string;
    };

export async function runPoseAnalysis({
  video,
  canvas,
  progression,
  rangeStart,
  rangeEnd,
  onProgress,
  onLiveAngles,
}: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  // null = mode mesure : renvoie les angles réels sans les noter (figure
  // pas encore calibrée, utilisé pour collecter des échantillons)
  progression: Progression | null;
  rangeStart?: number;
  rangeEnd?: number;
  onProgress?: (percent: number) => void;
  onLiveAngles?: (angles: PoseAngles) => void;
}): Promise<PoseAnalysisResult> {
  const landmarker = await getLandmarker();

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context2d = canvas.getContext("2d");
  if (!context2d) throw new Error("Impossible d'initialiser le canvas d'analyse.");
  const ctx: CanvasRenderingContext2D = context2d;
  const drawingUtils = new DrawingUtils(ctx);

  const frames: NormalizedLandmark[][] = [];
  const angles: PoseAngles[] = [];
  let attempted = 0;

  const start = rangeStart ?? 0;
  const end = rangeEnd ?? video.duration;

  video.currentTime = start;
  await video.play();

  await new Promise<void>((resolve) => {
    function loop() {
      if (video.paused || video.ended || video.currentTime >= end) {
        video.pause();
        resolve();
        return;
      }

      attempted += 1;
      if (end > start) {
        onProgress?.(
          Math.min(
            100,
            Math.round(((video.currentTime - start) / (end - start)) * 100)
          )
        );
      }

      const result = landmarker.detectForVideo(video, performance.now());

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const landmarks of result.landmarks) {
        frames.push(landmarks);
        const a = computeAngles(landmarks);
        angles.push(a);
        onLiveAngles?.(a);

        drawingUtils.drawLandmarks(landmarks, { radius: 3 });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
      }

      requestAnimationFrame(loop);
    }
    loop();
  });

  const detectionRate = attempted > 0 ? frames.length / attempted : 0;

  if (frames.length === 0) {
    return {
      ok: false,
      framesAnalyzed: 0,
      detectionRate: 0,
      warning:
        "Aucun corps détecté dans cette vidéo. Vérifie que tu es entièrement visible dans le cadre, avec un bon éclairage.",
    };
  }

  const warning =
    detectionRate < 0.5
      ? `Corps détecté seulement sur ${Math.round(detectionRate * 100)}% des frames — vérifie le cadrage et l'angle de caméra pour un résultat fiable.`
      : null;

  const window = detectHoldWindow(frames);
  const holdAngles = angles.slice(window.start, window.end + 1);
  const median = medianAngles(holdAngles);

  const midIndex = Math.floor((window.start + window.end) / 2);
  const representativeFrameDataUrl = await captureFrame(
    video,
    frames[midIndex],
    start,
    end,
    frames.length,
    midIndex
  );

  if (progression === null) {
    return {
      ok: true,
      framesAnalyzed: frames.length,
      detectionRate,
      warning,
      holdWindow: window,
      summaryAngles: median,
      scores: [],
      globalScoreValue: 0,
      recommendations: [],
      representativeFrameDataUrl,
    };
  }

  const scores = scoreAngles(median, progression);
  const weakest = pickWeakestCriterion(scores);
  const recommendations = recommendationsFor(weakest.critere, median.pelvisSagSign);

  return {
    ok: true,
    framesAnalyzed: frames.length,
    detectionRate,
    warning,
    holdWindow: window,
    summaryAngles: median,
    scores,
    globalScoreValue: globalScore(scores),
    recommendations,
    representativeFrameDataUrl,
  };
}

async function captureFrame(
  video: HTMLVideoElement,
  landmarks: NormalizedLandmark[] | undefined,
  rangeStart: number,
  rangeEnd: number,
  totalFrames: number,
  index: number
): Promise<string | null> {
  if (!landmarks) return null;

  const targetTime = rangeStart + (index / totalFrames) * (rangeEnd - rangeStart);
  await seekTo(video, targetTime);

  const offscreen = document.createElement("canvas");
  offscreen.width = video.videoWidth;
  offscreen.height = video.videoHeight;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
  const drawingUtils = new DrawingUtils(ctx);
  drawingUtils.drawLandmarks(landmarks, { radius: 3 });
  drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

  return offscreen.toDataURL("image/jpeg", 0.85);
}

export type { Progression };
