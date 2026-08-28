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
import { drawAngleLabels } from "./canvasHud";

let sharedLandmarkerPromise: Promise<PoseLandmarker> | null = null;

export function getLandmarker() {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    ).then((vision) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          // Modèle "heavy" (le plus précis des 3 tiers MediaPipe, plus lourd
          // que "full") : les figures de calisthénie (inversées, membres
          // repliés) s'éloignent beaucoup des poses "debout" habituelles,
          // la précision supplémentaire compte plus que la vitesse de
          // chargement ici.
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    );
  }
  return sharedLandmarkerPromise;
}

export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
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
      holdDurationSeconds: number | null;
      summaryAngles: PoseAngles;
      scores: CriterionScore[];
      globalScoreValue: number;
      recommendations: Recommendation[];
      representativeFrameDataUrl: string | null;
      // Landmarks bruts déjà calculés pendant l'analyse, réutilisés par
      // l'export vidéo annotée pour éviter de refaire tourner l'inférence
      // pose (coûteuse) une seconde fois image par image.
      landmarksFrames: NormalizedLandmark[][];
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
  signal,
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
  // Permet d'annuler une analyse en cours (ex. l'utilisateur se rend
  // compte d'une erreur pendant le traitement) sans attendre la fin.
  signal?: AbortSignal;
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

  await new Promise<void>((resolve, reject) => {
    function loop() {
      if (signal?.aborted) {
        video.pause();
        reject(new DOMException("Analyse annulée.", "AbortError"));
        return;
      }

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
        drawAngleLabels(ctx, canvas, landmarks, a);
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

  const window = detectHoldWindow(frames);
  const holdAngles = angles.slice(window.start, window.end + 1);
  const median = medianAngles(holdAngles);
  // Si aucun segment immobile assez long n'est trouvé, detectHoldWindow
  // retombe sur la vidéo entière (voir angles.ts) — dans ce cas la "durée"
  // ne correspond à aucun hold réel, mieux vaut ne rien afficher que de
  // faire croire que la figure a été tenue pendant tout le clip.
  const holdDurationSeconds = window.detected
    ? ((window.end - window.start + 1) / frames.length) * (end - start)
    : null;

  const warningParts: string[] = [];
  if (detectionRate < 0.5) {
    warningParts.push(
      `Corps détecté seulement sur ${Math.round(detectionRate * 100)}% des frames — vérifie le cadrage et l'angle de caméra pour un résultat fiable.`
    );
  }
  if (!window.detected) {
    warningParts.push(
      "Aucune position stable assez longue détectée — la durée du hold n'a pas pu être mesurée. Filme si possible avec le téléphone posé/stable plutôt qu'à la main."
    );
  }
  // En straddle, les deux jambes doivent être écartées de part et d'autre
  // du corps ; si la caméra filme presque dans l'axe de cet écartement,
  // elles se superposent à l'écran et les angles genou/axe du corps
  // deviennent peu fiables — on prévient plutôt que d'afficher un score
  // silencieusement faussé.
  const isStraddleVariant =
    progression === "straddle_planche" || progression === "straddle_front_lever";
  if (isStraddleVariant && median.legOcclusionRisk) {
    warningParts.push(
      "Une jambe peut être mal détectée ou superposée à l'autre sur cette vidéo — pour un straddle, filme légèrement de biais (pas totalement de face ni de profil) pour bien distinguer les deux jambes, sinon les angles genou et axe du corps peuvent être faussés."
    );
  }
  const warning = warningParts.length > 0 ? warningParts.join(" ") : null;

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
      holdDurationSeconds,
      summaryAngles: median,
      scores: [],
      globalScoreValue: 0,
      recommendations: [],
      representativeFrameDataUrl,
      landmarksFrames: frames,
    };
  }

  // Un handstand exige un corps inversé (mains au sol, pieds en l'air) —
  // sans ce contrôle, une personne simplement debout donne aussi un axe du
  // corps proche de 90° et se ferait noter comme un handstand valide.
  if (progression === "handstand" && !median.isInvertedPose) {
    return {
      ok: false,
      framesAnalyzed: frames.length,
      detectionRate,
      warning:
        "Position debout détectée, pas un handstand. Pour analyser un handstand, les mains doivent être au sol et les pieds en l'air (position inversée).",
    };
  }

  const scores = scoreAngles(median, progression);
  const weakest = pickWeakestCriterion(scores);
  const recommendations = recommendationsFor(
    weakest.critere,
    weakest.score,
    median.pelvisSagSign,
    weakest.valeurMesuree - weakest.valeurCible,
    progression
  );

  return {
    ok: true,
    framesAnalyzed: frames.length,
    detectionRate,
    warning,
    holdWindow: window,
    holdDurationSeconds,
    summaryAngles: median,
    scores,
    globalScoreValue: globalScore(scores),
    recommendations,
    representativeFrameDataUrl,
    landmarksFrames: frames,
  };
}

// Mesure une seule image fixe (photo) au lieu d'une vidéo — même modèle
// partagé (mode VIDEO accepte aussi une source image unique), pas de
// fenêtre de hold puisqu'il n'y a qu'une frame. Renvoie un objet au même
// format que runPoseAnalysis pour réutiliser le même affichage.
export async function measureImage(
  image: HTMLImageElement
): Promise<PoseAnalysisResult> {
  const landmarker = await getLandmarker();

  const result = landmarker.detectForVideo(image, performance.now());

  if (result.landmarks.length === 0) {
    return {
      ok: false,
      framesAnalyzed: 0,
      detectionRate: 0,
      warning:
        "Aucun corps détecté sur cette image. Vérifie que la personne est entièrement visible.",
    };
  }

  const landmarks = result.landmarks[0];
  const angles = computeAngles(landmarks);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  let representativeFrameDataUrl: string | null = null;
  if (ctx) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const drawingUtils = new DrawingUtils(ctx);
    drawingUtils.drawLandmarks(landmarks, { radius: 4 });
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
    drawAngleLabels(ctx, canvas, landmarks, angles);
    representativeFrameDataUrl = canvas.toDataURL("image/jpeg", 0.85);
  }

  return {
    ok: true,
    framesAnalyzed: 1,
    detectionRate: 1,
    warning: null,
    holdWindow: { start: 0, end: 0, detected: true },
    holdDurationSeconds: 0,
    summaryAngles: angles,
    scores: [],
    globalScoreValue: 0,
    recommendations: [],
    representativeFrameDataUrl,
    landmarksFrames: [landmarks],
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
  drawAngleLabels(ctx, offscreen, landmarks, computeAngles(landmarks));

  return offscreen.toDataURL("image/jpeg", 0.85);
}

export type { Progression };
