"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

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

export default function VideoPoseOverlay({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<NormalizedLandmark[][]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!analyzing) return;

    let cancelled = false;
    let animationFrameId: number;

    async function run() {
      const landmarker = await getLandmarker();
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || cancelled) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const drawingUtils = new DrawingUtils(ctx);

      framesRef.current = [];
      video.currentTime = 0;
      await video.play();

      function loop() {
        if (cancelled || !video || video.paused || video.ended) {
          if (!cancelled) {
            setAnalyzing(false);
            setStatus(
              `Analyse terminée : ${framesRef.current.length} frames traitées.`
            );
          }
          return;
        }

        const result = landmarker.detectForVideo(video, performance.now());

        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        for (const landmarks of result.landmarks) {
          framesRef.current.push(landmarks);
          drawingUtils.drawLandmarks(landmarks, { radius: 3 });
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS
          );
        }

        animationFrameId = requestAnimationFrame(loop);
      }

      loop();
    }

    run().catch((err) => {
      console.error(err);
      setStatus("Erreur : " + (err as Error).message);
      setAnalyzing(false);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyzing]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full rounded"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
        />
      </div>

      <button
        type="button"
        onClick={() => setAnalyzing(true)}
        disabled={analyzing}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {analyzing ? "Analyse en cours..." : "Analyser la pose"}
      </button>

      {status && <p className="text-xs text-gray-500">{status}</p>}
    </div>
  );
}
