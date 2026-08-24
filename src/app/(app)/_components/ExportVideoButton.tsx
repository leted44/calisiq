"use client";

import { useState, type RefObject } from "react";
import { recordAnnotatedVideo, downloadBlob } from "@/lib/pose/exportVideo";
import type { CriterionScore } from "@/lib/pose/scoring";
import { DownloadIcon } from "@/components/icons";

export default function ExportVideoButton({
  videoRef,
  figureLabel,
  globalScoreValue,
  scores,
  rangeStart,
  rangeEnd,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  figureLabel: string;
  globalScoreValue: number;
  scores: CriterionScore[];
  rangeStart?: number;
  rangeEnd?: number;
}) {
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    const video = videoRef.current;
    if (!video) return;

    setRecording(true);
    setProgress(0);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      const blob = await recordAnnotatedVideo({
        video,
        canvas,
        rangeStart: rangeStart ?? 0,
        rangeEnd: rangeEnd ?? video.duration,
        figureLabel,
        globalScoreValue,
        scores,
        onProgress: setProgress,
      });
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      downloadBlob(blob, `calisiq-${figureLabel.toLowerCase()}-${Date.now()}.${extension}`);
    } catch (err) {
      setError("Export impossible : " + (err as Error).message);
    } finally {
      setRecording(false);
      video.pause();
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={recording}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 hover:border-cyan-700 disabled:opacity-50"
      >
        <DownloadIcon className="h-4 w-4 text-cyan-400" />
        {recording ? `Génération... ${progress}%` : "Télécharger la vidéo annotée"}
      </button>
      {recording && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
