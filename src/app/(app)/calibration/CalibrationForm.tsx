"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { runPoseAnalysis, type PoseAnalysisResult } from "@/lib/pose/runAnalysis";

const VARIATIONS = [
  { value: "handstand", label: "Handstand (statique)" },
  { value: "handstand_push_up", label: "Handstand Push-up" },
  { value: "one_arm_handstand", label: "One Arm Handstand" },
] as const;

const MIN_TRIM_SECONDS = 2;

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Impossible de lire ce fichier vidéo."));
    };
    video.src = URL.createObjectURL(file);
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

export default function CalibrationForm() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [variation, setVariation] = useState<(typeof VARIATIONS)[number]["value"]>(
    VARIATIONS[0].value
  );
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [analyzing, setAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [result, setResult] = useState<PoseAnalysisResult | null>(null);
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError(null);
    setResult(null);
    setSaved(false);

    let videoDuration: number;
    try {
      videoDuration = await getVideoDuration(selected);
    } catch {
      setError("Impossible de lire cette vidéo. Essaie un autre fichier.");
      return;
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(selected);
    setVideoUrl(URL.createObjectURL(selected));
    setDuration(videoDuration);
    setTrimStart(0);
    setTrimEnd(videoDuration);
  }

  function handleReset() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setDuration(null);
    setTrimStart(0);
    setTrimEnd(0);
    setResult(null);
    setRating("");
    setNotes("");
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleMeasure() {
    setError(null);
    if (!file || !duration || !previewVideoRef.current || !canvasRef.current) return;

    if (trimEnd - trimStart < MIN_TRIM_SECONDS) {
      setError(
        `Le segment sélectionné est trop court : il faut au moins ${MIN_TRIM_SECONDS}s pour capturer un hold stable.`
      );
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setProgressPercent(0);

    try {
      const analysisResult = await runPoseAnalysis({
        video: previewVideoRef.current,
        canvas: canvasRef.current,
        progression: null,
        rangeStart: trimStart,
        rangeEnd: trimEnd,
        onProgress: setProgressPercent,
      });
      setAnalyzing(false);
      setResult(analysisResult);
    } catch (err) {
      setAnalyzing(false);
      setError("La mesure a échoué : " + (err as Error).message);
    }
  }

  async function handleSaveSample() {
    if (!result || !result.ok) return;
    const ratingValue = Number(rating);
    if (!rating || Number.isNaN(ratingValue) || ratingValue < 0 || ratingValue > 10) {
      setError("Indique une note entre 0 et 10.");
      return;
    }

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expirée, reconnecte-toi.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("calibration_samples").insert({
      user_id: user.id,
      figure: "handstand",
      variation,
      elbow_angle: result.summaryAngles.elbowAngle,
      hip_angle: result.summaryAngles.hipAngle,
      body_line_angle_from_horizontal: result.summaryAngles.bodyLineAngleFromHorizontal,
      shoulder_protraction: result.summaryAngles.shoulderProtraction,
      pelvis_deviation: result.summaryAngles.pelvisDeviation,
      pelvis_sag_sign: result.summaryAngles.pelvisSagSign,
      user_rating: ratingValue,
      notes: notes || null,
    });

    setSaving(false);

    if (insertError) {
      setError("Enregistrement impossible : " + insertError.message);
      return;
    }

    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Variation
        </label>
        <select
          value={variation}
          onChange={(e) => setVariation(e.target.value as (typeof VARIATIONS)[number]["value"])}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-cyan-500"
        >
          {VARIATIONS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {!videoUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-6 text-sm font-medium text-slate-200 hover:border-cyan-700"
        >
          Importer une vidéo
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {videoUrl && duration !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Découpe
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Changer de vidéo
            </button>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-800">
            <video ref={previewVideoRef} src={videoUrl} controls playsInline className="w-full" />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
            />
          </div>

          {!result && (
            <div>
              <p className="mb-2 text-xs text-slate-500">
                Sélectionne uniquement le passage à mesurer
              </p>
              <div className="relative h-6">
                <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-700" />
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  style={{
                    left: `${(trimStart / duration) * 100}%`,
                    right: `${100 - (trimEnd / duration) * 100}%`,
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - MIN_TRIM_SECONDS))}
                  className="dual-range"
                />
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + MIN_TRIM_SECONDS))}
                  className="dual-range"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Début : {formatTime(trimStart)}</span>
                <span>Fin : {formatTime(trimEnd)}</span>
                <span>Durée : {formatTime(trimEnd - trimStart)}</span>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!result && !analyzing && (
            <button
              type="button"
              onClick={handleMeasure}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            >
              Mesurer
            </button>
          )}

          {result && result.ok && (
            <div className="space-y-4">
              {result.warning && (
                <p className="rounded-lg bg-orange-500/10 p-2 text-xs text-orange-400">
                  {result.warning}
                </p>
              )}

              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Angles mesurés
                </p>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Coude</dt>
                    <dd className="font-mono text-white">
                      {result.summaryAngles.elbowAngle.toFixed(1)}°
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Hanche</dt>
                    <dd className="font-mono text-white">
                      {result.summaryAngles.hipAngle.toFixed(1)}°
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Ligne de corps (vs horizontale)</dt>
                    <dd className="font-mono text-white">
                      {result.summaryAngles.bodyLineAngleFromHorizontal.toFixed(1)}°
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Protraction épaules</dt>
                    <dd className="font-mono text-white">
                      {result.summaryAngles.shoulderProtraction.toFixed(3)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Déviation bassin</dt>
                    <dd className="font-mono text-white">
                      {result.summaryAngles.pelvisDeviation.toFixed(3)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Signe sag/pike bassin</dt>
                    <dd className="font-mono text-white">
                      {result.summaryAngles.pelvisSagSign.toFixed(3)}
                    </dd>
                  </div>
                </dl>
              </div>

              {result.representativeFrameDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.representativeFrameDataUrl}
                  alt="Frame représentative"
                  className="w-full rounded-xl border border-slate-800"
                />
              )}

              {!saved ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Ta note (0-10)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={10}
                      step={0.5}
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      placeholder="Ex. 8"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Notes (facultatif)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex. léger arch dans le dos, coudes tendus"
                      rows={2}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSample}
                    disabled={saving}
                    className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-50"
                  >
                    {saving ? "Enregistrement..." : "Enregistrer l'échantillon"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">
                    Échantillon enregistré.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full rounded-lg border border-slate-700 py-2.5 font-medium text-slate-200 hover:border-slate-600"
                  >
                    Mesurer un autre essai
                  </button>
                </div>
              )}
            </div>
          )}

          {result && !result.ok && (
            <p className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-400">
              {result.warning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
