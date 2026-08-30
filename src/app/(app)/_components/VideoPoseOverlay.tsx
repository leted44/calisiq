"use client";

import { useRef, useState } from "react";
import { runPoseAnalysis, type PoseAnalysisResult } from "@/lib/pose/runAnalysis";
import type { Progression } from "@/lib/pose/grid";
import type { CriterionScore } from "@/lib/pose/scoring";
import type { Recommendation } from "@/lib/pose/recommendations";
import { figureFromProgression, PROGRESSION_LABELS } from "@/lib/pose/report";
import { createClient } from "@/lib/supabase/client";
import ResultCard from "./ResultCard";
import ExportVideoButton from "./ExportVideoButton";

type PersistedReport = {
  globalScoreValue: number;
  scores: CriterionScore[];
  recommendations: Recommendation[];
  holdDurationSeconds: number | null;
};

export default function VideoPoseOverlay({
  videoUrl,
  sessionId,
  progression,
  trimStart,
  trimEnd,
  initialReport,
}: {
  videoUrl: string;
  sessionId: string;
  progression: Progression;
  trimStart?: number;
  trimEnd?: number;
  initialReport?: PersistedReport | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState<PoseAnalysisResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const figure = figureFromProgression(progression);

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
      .update({
        status: "done",
        hold_duration_seconds: analysisResult.holdDurationSeconds,
      })
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

  const freshResult = !analyzing && result?.ok ? result : null;
  const report = freshResult ?? (initialReport ? { ...initialReport, ok: true as const } : null);

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
          className="whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:border-cyan-700 disabled:opacity-50"
        >
          {analyzing
            ? "Analyse en cours..."
            : report
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

      {!analyzing && freshResult?.warning && (
        <p className="rounded-lg bg-orange-500/10 p-2 text-xs text-orange-400">
          {freshResult.warning}
        </p>
      )}

      {!analyzing && report && (
        <>
          <ResultCard
            globalScoreValue={report.globalScoreValue}
            representativeFrame={freshResult?.representativeFrameDataUrl ?? null}
            scores={report.scores}
            recommendations={report.recommendations}
            holdDurationSeconds={report.holdDurationSeconds}
            figure={figure}
          />
          <ExportVideoButton
            videoRef={videoRef}
            figureLabel={PROGRESSION_LABELS[progression] ?? progression}
            globalScoreValue={report.globalScoreValue}
            scores={report.scores}
            progression={progression}
            rangeStart={trimStart}
            rangeEnd={trimEnd}
            landmarksFrames={freshResult?.landmarksFrames}
            holdStartSeconds={freshResult?.holdStartSeconds}
            holdEndSeconds={freshResult?.holdEndSeconds}
            holdDurationSeconds={report.holdDurationSeconds}
            weakPointCue={report.recommendations[0]?.exercice ?? null}
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
