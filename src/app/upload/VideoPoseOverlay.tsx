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
import {
  pickWeakestCriterion,
  recommendationsFor,
  type Recommendation,
} from "@/lib/pose/recommendations";
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
  const attemptedFramesRef = useRef(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [currentAngles, setCurrentAngles] = useState<PoseAngles | null>(null);
  const [summaryAngles, setSummaryAngles] = useState<PoseAngles | null>(null);
  const [holdWindow, setHoldWindow] = useState<HoldWindow | null>(null);
  const [scores, setScores] = useState<CriterionScore[] | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [representativeFrame, setRepresentativeFrame] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);

  async function saveScores(
    criteriaScores: CriterionScore[],
    exercises: Recommendation[]
  ) {
    const supabase = createClient();

    await supabase.from("scores").delete().eq("session_id", sessionId);
    await supabase.from("recommendations").delete().eq("session_id", sessionId);

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

    if (exercises.length > 0) {
      const { error: recommendationsError } = await supabase
        .from("recommendations")
        .insert(
          exercises.map((r) => ({
            session_id: sessionId,
            exercice: r.exercice,
            raison: r.raison,
          }))
        );
      if (recommendationsError) throw recommendationsError;
    }

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ status: "done" })
      .eq("id", sessionId);
    if (sessionError) throw sessionError;
  }

  async function captureRepresentativeFrame(index: number) {
    const video = videoRef.current;
    const landmarks = framesRef.current[index];
    if (!video || !landmarks || framesRef.current.length === 0) return;

    const targetTime =
      (index / framesRef.current.length) * (video.duration || 0);
    await seekTo(video, targetTime);

    const offscreen = document.createElement("canvas");
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
    const drawingUtils = new DrawingUtils(ctx);
    drawingUtils.drawLandmarks(landmarks, { radius: 3 });
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

    setRepresentativeFrame(offscreen.toDataURL("image/jpeg", 0.85));
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
      attemptedFramesRef.current = 0;
      setSummaryAngles(null);
      setHoldWindow(null);
      setScores(null);
      setRecommendations(null);
      setRepresentativeFrame(null);
      setProgressPercent(0);
      setAnalysisWarning(null);
      video.currentTime = 0;
      await video.play();

      function loop() {
        if (cancelled || !video || video.paused || video.ended) {
          if (!cancelled) {
            setAnalyzing(false);

            const detectionRate =
              attemptedFramesRef.current > 0
                ? framesRef.current.length / attemptedFramesRef.current
                : 0;

            setStatus(
              `Analyse terminée : ${framesRef.current.length} frames traitées.`
            );

            if (framesRef.current.length === 0) {
              setAnalysisWarning(
                "Aucun corps détecté dans cette vidéo. Vérifie que tu es entièrement visible dans le cadre, avec un bon éclairage."
              );
            } else if (detectionRate < 0.5) {
              setAnalysisWarning(
                `Corps détecté seulement sur ${Math.round(detectionRate * 100)}% des frames — vérifie le cadrage et l'angle de caméra pour un résultat fiable.`
              );
            }

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

              const weakest = pickWeakestCriterion(criteriaScores);
              const exercises = recommendationsFor(
                weakest.critere,
                median.pelvisSagSign
              );
              setRecommendations(exercises);

              const midIndex = Math.floor((window.start + window.end) / 2);
              captureRepresentativeFrame(midIndex).catch(console.error);

              saveScores(criteriaScores, exercises).catch((err) => {
                console.error(err);
                setSaveError((err as Error).message);
              });
            }
          }
          return;
        }

        attemptedFramesRef.current += 1;
        if (video.duration > 0) {
          setProgressPercent(
            Math.min(100, Math.round((video.currentTime / video.duration) * 100))
          );
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

  const showResults = !analyzing && scores !== null;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-slate-800">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          crossOrigin="anonymous"
          className="w-full"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAnalyzing(true)}
          disabled={analyzing}
          className="whitespace-nowrap rounded-lg bg-gradient-to-r from-sky-400 to-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {analyzing
            ? "Analyse en cours..."
            : showResults
            ? "Ré-analyser la pose"
            : "Analyser la pose"}
        </button>

        {analyzing && (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {analyzing && currentAngles && (
        <p className="font-mono text-xs text-slate-500">
          coude: {currentAngles.elbowAngle.toFixed(0)}° · hanche:{" "}
          {currentAngles.hipAngle.toFixed(0)}° · inclinaison corps:{" "}
          {currentAngles.bodyLineAngleFromHorizontal.toFixed(0)}°
        </p>
      )}

      {!analyzing && analysisWarning && (
        <p className="rounded-lg bg-orange-500/10 p-2 text-xs text-orange-400">
          {analysisWarning}
        </p>
      )}

      {showResults && scores && (
        <ResultCard
          globalScoreValue={globalScore(scores)}
          representativeFrame={representativeFrame}
          scores={scores}
          recommendations={recommendations}
        />
      )}

      {saveError && (
        <p className="text-xs text-red-400">
          Score calculé mais non sauvegardé : {saveError}
        </p>
      )}

      {showResults && (
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs text-slate-500 underline hover:text-slate-400"
        >
          {showDetails ? "Masquer les détails techniques" : "Voir les détails techniques"}
        </button>
      )}

      {showDetails && (
        <div className="space-y-1 rounded-lg bg-slate-900 p-2 text-xs text-slate-500">
          {status && <p>{status}</p>}
          {holdWindow && (
            <p>
              {holdWindow.detected
                ? `Hold détecté : frames ${holdWindow.start} à ${holdWindow.end} (sur ${framesRef.current.length} au total).`
                : "Pas de segment immobile clairement détecté — médiane calculée sur toute la vidéo."}
            </p>
          )}
          {summaryAngles && (
            <p className="font-mono">
              Médiane sur le hold — coude: {summaryAngles.elbowAngle.toFixed(0)}° ·
              hanche: {summaryAngles.hipAngle.toFixed(0)}° · inclinaison corps:{" "}
              {summaryAngles.bodyLineAngleFromHorizontal.toFixed(0)}°
            </p>
          )}
        </div>
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

function scoreColor(score: number): string {
  if (score >= 7) return "bg-green-400";
  if (score >= 4) return "bg-orange-400";
  return "bg-red-500";
}

function scoreTextColor(score: number): string {
  if (score >= 7) return "text-green-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-500";
}

function ResultCard({
  globalScoreValue,
  representativeFrame,
  scores,
  recommendations,
}: {
  globalScoreValue: number;
  representativeFrame: string | null;
  scores: CriterionScore[];
  recommendations: Recommendation[] | null;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-4">
        {representativeFrame && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={representativeFrame}
            alt="Frame représentative du hold"
            className="h-24 w-24 rounded-lg object-cover"
          />
        )}
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Score global
          </p>
          <p className={`text-3xl font-bold ${scoreTextColor(globalScoreValue)}`}>
            {globalScoreValue.toFixed(1)}
            <span className="text-base font-normal text-slate-600">/10</span>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {scores.map((s) => {
          const isAngle = s.critere === "hip_angle" || s.critere === "elbow_angle";
          const unit = isAngle ? "°" : "";
          const decimals = isAngle ? 0 : 2;
          return (
            <div key={s.critere}>
              <div className="mb-0.5 flex justify-between text-xs text-slate-400">
                <span>{CRITERE_LABELS[s.critere]}</span>
                <span>
                  {s.score.toFixed(1)}/10 (mesuré {s.valeurMesuree.toFixed(decimals)}
                  {unit}, cible {s.valeurCible.toFixed(decimals)}
                  {unit})
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${scoreColor(s.score)}`}
                  style={{ width: `${Math.min(100, s.score * 10)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {recommendations && recommendations.length > 0 && (
        <div className="rounded-lg border border-sky-900/50 bg-sky-500/10 p-3">
          <p className="mb-1 text-sm font-semibold text-sky-300">
            À travailler en priorité
          </p>
          <ul className="space-y-1 text-xs text-slate-300">
            {recommendations.map((r) => (
              <li key={r.exercice}>
                <span className="font-medium text-white">{r.exercice}</span> —{" "}
                {r.raison}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
