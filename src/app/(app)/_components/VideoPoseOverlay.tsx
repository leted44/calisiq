"use client";

import { useRef, useState } from "react";
import { runPoseAnalysis, type PoseAnalysisResult } from "@/lib/pose/runAnalysis";
import type { Progression } from "@/lib/pose/grid";
import { createClient } from "@/lib/supabase/client";
import ResultCard from "./ResultCard";

export default function VideoPoseOverlay({
  videoUrl,
  sessionId,
  progression,
  trimStart,
  trimEnd,
}: {
  videoUrl: string;
  sessionId: string;
  progression: Progression;
  trimStart?: number;
  trimEnd?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState<PoseAnalysisResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveResult(analysisResult: Extract<PoseAnalysisResult, { ok: true }>) {
    const supabase = createClient();

    await supabase.from("scores").delete().eq("session_id", sessionId);
    await supabase.from("recommendations").delete().eq("session_id", sessionId);

    const { error: scoresError } = await supabase.from("scores").insert(
      analysisResult.scores.map((s) => ({
        session_id: sessionId,
        critere: s.critere,
        score: s.score,
        valeur_mesuree: s.valeurMesuree,
        valeur_cible: s.valeurCible,
      }))
    );
    if (scoresError) throw scoresError;

    if (analysisResult.recommendations.length > 0) {
      const { error: recommendationsError } = await supabase
        .from("recommendations")
        .insert(
          analysisResult.recommendations.map((r) => ({
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

  async function handleAnalyze() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setAnalyzing(true);
    setError(null);
    setSaveError(null);
    setResult(null);
    setProgressPercent(0);

    try {
      const analysisResult = await runPoseAnalysis({
        video,
        canvas,
        progression,
        rangeStart: trimStart,
        rangeEnd: trimEnd,
        onProgress: setProgressPercent,
      });

      setResult(analysisResult);

      if (analysisResult.ok) {
        await saveResult(analysisResult).catch((err) => {
          console.error(err);
          setSaveError((err as Error).message);
        });
      }
    } catch (err) {
      console.error(err);
      setError("L'analyse a échoué : " + (err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  const showResults = !analyzing && result?.ok;

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
          onClick={handleAnalyze}
          disabled={analyzing}
          className="whitespace-nowrap rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.25)] disabled:opacity-50"
        >
          {analyzing
            ? "Analyse en cours..."
            : result
            ? "Ré-analyser la pose"
            : "Analyser la pose"}
        </button>

        {analyzing && (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!analyzing && result && !result.ok && (
        <p className="rounded-lg bg-orange-500/10 p-2 text-xs text-orange-400">
          {result.warning}
        </p>
      )}

      {showResults && result?.ok && (
        <>
          {result.warning && (
            <p className="rounded-lg bg-orange-500/10 p-2 text-xs text-orange-400">
              {result.warning}
            </p>
          )}
          <ResultCard
            globalScoreValue={result.globalScoreValue}
            representativeFrame={result.representativeFrameDataUrl}
            scores={result.scores}
            recommendations={result.recommendations}
          />
        </>
      )}

      {saveError && (
        <p className="text-xs text-red-400">
          Score calculé mais non sauvegardé : {saveError}
        </p>
      )}
    </div>
  );
}
