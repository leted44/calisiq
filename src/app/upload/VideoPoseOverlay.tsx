"use client";

import { useEffect, useRef, useState } from "react";
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
} from "@/lib/pose/angles";
import { scoreAngles, globalScore, type CriterionScore } from "@/lib/pose/scoring";
import type { Progression } from "@/lib/pose/grid";
import { createClient } from "@/lib/supabase/client";

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

export default function VideoPoseOverlay({
  videoUrl,
  sessionId,
  progression,
}: {
  videoUrl: string;
  sessionId: string;
  progression: Progression;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<NormalizedLandmark[][]>([]);
  const anglesRef = useRef<PoseAngles[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [currentAngles, setCurrentAngles] = useState<PoseAngles | null>(null);
  const [summaryAngles, setSummaryAngles] = useState<PoseAngles | null>(null);
  const [holdWindow, setHoldWindow] = useState<HoldWindow | null>(null);
  const [scores, setScores] = useState<CriterionScore[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveScores(criteriaScores: CriterionScore[]) {
    const supabase = createClient();

    await supabase.from("scores").delete().eq("session_id", sessionId);

    const { error: scoresError } = await supabase.from("scores").insert(
      criteriaScores.map((s) => ({
        session_id: sessionId,
        critere: s.critere,
        score: s.score,
        valeur_mesuree: s.valeurMesuree,
        valeur_cible: s.valeurCible,
      }))
    );
    if (scoresError) throw scoresError;

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ status: "done" })
      .eq("id", sessionId);
    if (sessionError) throw sessionError;
  }

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
      anglesRef.current = [];
      setSummaryAngles(null);
      setHoldWindow(null);
      video.currentTime = 0;
      await video.play();

      function loop() {
        if (cancelled || !video || video.paused || video.ended) {
          if (!cancelled) {
            setAnalyzing(false);
            setStatus(
              `Analyse terminée : ${framesRef.current.length} frames traitées.`
            );
            if (framesRef.current.length > 0) {
              const window = detectHoldWindow(framesRef.current);
              setHoldWindow(window);
              const holdAngles = anglesRef.current.slice(
                window.start,
                window.end + 1
              );
              const median = medianAngles(holdAngles);
              setSummaryAngles(median);

              const criteriaScores = scoreAngles(median, progression);
              setScores(criteriaScores);
              saveScores(criteriaScores).catch((err) => {
                console.error(err);
                setSaveError((err as Error).message);
              });
            }
          }
          return;
        }

        const result = landmarker.detectForVideo(video, performance.now());

        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        for (const landmarks of result.landmarks) {
          framesRef.current.push(landmarks);
          const angles = computeAngles(landmarks);
          anglesRef.current.push(angles);
          setCurrentAngles(angles);

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
          crossOrigin="anonymous"
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

      {analyzing && currentAngles && (
        <p className="font-mono text-xs text-gray-600">
          coude: {currentAngles.elbowAngle.toFixed(0)}° · hanche:{" "}
          {currentAngles.hipAngle.toFixed(0)}° · inclinaison corps:{" "}
          {currentAngles.bodyLineAngleFromHorizontal.toFixed(0)}°
        </p>
      )}

      {holdWindow && (
        <p className="text-xs text-gray-500">
          {holdWindow.detected
            ? `Hold détecté : frames ${holdWindow.start} à ${holdWindow.end} (sur ${framesRef.current.length} au total).`
            : "Pas de segment immobile clairement détecté — médiane calculée sur toute la vidéo."}
        </p>
      )}

      {summaryAngles && (
        <p className="font-mono text-xs text-gray-800">
          Médiane sur le hold — coude: {summaryAngles.elbowAngle.toFixed(0)}° ·
          hanche: {summaryAngles.hipAngle.toFixed(0)}° · inclinaison corps:{" "}
          {summaryAngles.bodyLineAngleFromHorizontal.toFixed(0)}°
        </p>
      )}

      {scores && (
        <div className="rounded bg-gray-100 p-3">
          <p className="mb-1 text-sm font-semibold text-gray-900">
            Score global : {globalScore(scores).toFixed(1)}/10
          </p>
          <ul className="space-y-0.5 text-xs text-gray-700">
            {scores.map((s) => {
              const isAngle = s.critere === "hip_angle" || s.critere === "elbow_angle";
              const unit = isAngle ? "°" : "";
              const decimals = isAngle ? 0 : 2;
              return (
                <li key={s.critere}>
                  {CRITERE_LABELS[s.critere]} : {s.score.toFixed(1)}/10 (mesuré{" "}
                  {s.valeurMesuree.toFixed(decimals)}
                  {unit}, cible {s.valeurCible.toFixed(decimals)}
                  {unit})
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {saveError && (
        <p className="text-xs text-red-600">
          Score calculé mais non sauvegardé : {saveError}
        </p>
      )}
    </div>
  );
}

const CRITERE_LABELS: Record<CriterionScore["critere"], string> = {
  shoulder_protraction: "Protraction",
  pelvis_deviation: "Bassin",
  hip_angle: "Genou-hanche-épaule",
  elbow_angle: "Coude",
};
