"use client";

import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export default function PosePocPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Chargement du modèle...");

  useEffect(() => {
    let landmarker: PoseLandmarker | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let cancelled = false;

    async function setup() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      if (cancelled) return;

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const drawingUtils = new DrawingUtils(ctx);

      setStatus("Détection en cours");

      function renderLoop() {
        if (cancelled || !landmarker || !video || !ctx) return;

        const result = landmarker.detectForVideo(video, performance.now());

        ctx.save();
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        for (const landmarks of result.landmarks) {
          drawingUtils.drawLandmarks(landmarks, {
            radius: 3,
          });
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS
          );
        }
        ctx.restore();

        animationFrameId = requestAnimationFrame(renderLoop);
      }

      renderLoop();
    }

    setup().catch((err) => {
      console.error(err);
      setStatus("Erreur : " + (err as Error).message);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach((track) => track.stop());
      landmarker?.close();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-slate-950 p-8">
      <h1 className="text-xl font-semibold text-white">
        POC MediaPipe — squelette en direct
      </h1>
      <p className="text-sm text-slate-500">{status}</p>

      <div className="relative overflow-hidden rounded-xl border border-slate-800">
        <video
          ref={videoRef}
          className="w-[640px] max-w-full -scale-x-100"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute left-0 top-0 w-[640px] max-w-full -scale-x-100"
        />
      </div>
    </div>
  );
}
