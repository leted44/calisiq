"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  runPoseAnalysis,
  measureImage,
  type PoseAnalysisResult,
} from "@/lib/pose/runAnalysis";

const VARIATIONS = [
  { value: "tuck_planche", label: "Tuck Planche", figure: "planche" },
  { value: "advanced_tuck_planche", label: "Advanced Tuck Planche", figure: "planche" },
  { value: "straddle_planche", label: "Straddle Planche", figure: "planche" },
  { value: "full_planche", label: "Full Planche", figure: "planche" },
  { value: "handstand", label: "Handstand (statique)", figure: "handstand" },
  { value: "handstand_push_up", label: "Handstand Push-up", figure: "handstand" },
  { value: "one_arm_handstand", label: "One Arm Handstand", figure: "handstand" },
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
  const previewImageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [variation, setVariation] = useState<(typeof VARIATIONS)[number]["value"]>(
    VARIATIONS[0].value
  );
  const figure = VARIATIONS.find((v) => v.value === variation)?.figure ?? "planche";

  const [mediaKind, setMediaKind] = useState<"video" | "image" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
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

    if (mediaUrl) URL.revokeObjectURL(mediaUrl);

    if (selected.type.startsWith("image/")) {
      setFile(selected);
      setMediaUrl(URL.createObjectURL(selected));
      setMediaKind("image");
      setDuration(null);
      return;
    }

    let videoDuration: number;
    try {
      videoDuration = await getVideoDuration(selected);
    } catch {
      setError("Impossible de lire ce fichier. Essaie une autre vidéo ou photo.");
      return;
    }

    setFile(selected);
    setMediaUrl(URL.createObjectURL(selected));
    setMediaKind("video");
    setDuration(videoDuration);
    setTrimStart(0);
    setTrimEnd(videoDuration);
  }

  function handleReset() {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setFile(null);
    setMediaUrl(null);
    setMediaKind(null);
    setDuration(null);
    setTrimStart(0);
    setTrimEnd(0);
    setResult(null);
    setRating("");
    setNotes("");
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function seekPreview(time: number) {
    const video = previewVideoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = time;
  }

  function handleTrimStartChange(value: number) {
    const next = Math.min(value, trimEnd - MIN_TRIM_SECONDS);
    setTrimStart(next);
    seekPreview(next);
  }

  function handleTrimEndChange(value: number) {
    const next = Math.max(value, trimStart + MIN_TRIM_SECONDS);
    setTrimEnd(next);
    seekPreview(next);
  }

  async function handleMeasure() {
    setError(null);

    if (mediaKind === "image") {
      if (!previewImageRef.current) return;
      setAnalyzing(true);
      setResult(null);
      try {
        const analysisResult = await measureImage(previewImageRef.current);
        setAnalyzing(false);
        setResult(analysisResult);
      } catch (err) {
        setAnalyzing(false);
        setError("La mesure a échoué : " + (err as Error).message);
      }
      return;
    }

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
      figure,
      variation,
      elbow_angle: result.summaryAngles.elbowAngle,
      hip_angle: result.summaryAngles.hipAngle,
      knee_angle: result.summaryAngles.kneeAngle,
      shoulder_flexion_angle: result.summaryAngles.shoulderFlexionAngle,
      body_line_angle_from_horizontal: result.summaryAngles.bodyLineAngleFromHorizontal,
      shoulder_protraction: result.summaryAngles.shoulderProtraction,
      pelvis_deviation: result.summaryAngles.pelvisDeviation,
      pelvis_sag_sign: result.summaryAngles.pelvisSagSign,
      user_rating: ratingValue,
      notes: notes || null,
      media_type: mediaKind ?? "video",
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

      {!mediaUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-6 text-sm font-medium text-slate-200 hover:border-cyan-700"
        >
          Importer une vidéo ou une photo
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {mediaUrl && mediaKind === "image" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Photo
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Changer
            </button>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={previewImageRef}
            src={mediaUrl}
            alt="Aperçu"
            className="w-full rounded-xl border border-slate-800"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!result && (
            <button
              type="button"
              onClick={handleMeasure}
              disabled={analyzing}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-50"
            >
              {analyzing ? "Mesure..." : "Mesurer"}
            </button>
          )}
        </div>
      )}

      {mediaUrl && mediaKind === "video" && duration !== null && (
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
              Changer
            </button>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-800">
            <video ref={previewVideoRef} src={mediaUrl} controls playsInline className="w-full" />
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
                  onChange={(e) => handleTrimStartChange(Number(e.target.value))}
                  className="dual-range"
                />
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => handleTrimEndChange(Number(e.target.value))}
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
        </div>
      )}

      {mediaUrl && result && result.ok && (
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
                <dt className="text-slate-400">Genou</dt>
                <dd className="font-mono text-white">
                  {result.summaryAngles.kneeAngle.toFixed(1)}°
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Ligne de corps (vs horizontale)</dt>
                <dd className="font-mono text-white">
                  {result.summaryAngles.bodyLineAngleFromHorizontal.toFixed(1)}°
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Ouverture épaule (hanche-épaule-poignet)</dt>
                <dd className="font-mono text-white">
                  {result.summaryAngles.shoulderFlexionAngle.toFixed(1)}°
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

      {mediaUrl && result && !result.ok && (
        <p className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-400">
          {result.warning}
        </p>
      )}
    </div>
  );
}
