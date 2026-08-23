"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Figure = "planche" | "handstand";

const FIGURES: { value: Figure; label: string; available: boolean }[] = [
  { value: "planche", label: "Planche", available: true },
  { value: "handstand", label: "Handstand", available: false },
];

const PROGRESSIONS = [
  { value: "tuck_planche", label: "Tuck planche" },
  { value: "advanced_tuck_planche", label: "Advanced tuck planche" },
  { value: "straddle_planche", label: "Straddle planche" },
  { value: "full_planche", label: "Full planche" },
];

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

export default function UploadForm() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [step, setStep] = useState<"figure" | "details">("figure");
  const [figure, setFigure] = useState<Figure>("planche");
  const [progression, setProgression] = useState(PROGRESSIONS[0].value);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);

    let videoDuration: number;
    try {
      videoDuration = await getVideoDuration(selected);
    } catch {
      setError("Impossible de lire ce fichier vidéo. Essaie un autre fichier.");
      return;
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(selected);
    setVideoUrl(URL.createObjectURL(selected));
    setDuration(videoDuration);
    setTrimStart(0);
    setTrimEnd(videoDuration);
  }

  function handleRemoveVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setDuration(null);
    setTrimStart(0);
    setTrimEnd(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleChangeVideo() {
    fileInputRef.current?.click();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file || !duration) {
      setError("Choisis une vidéo.");
      return;
    }

    if (trimEnd - trimStart < MIN_TRIM_SECONDS) {
      setError(
        `Le segment sélectionné est trop court : il faut au moins ${MIN_TRIM_SECONDS}s pour capturer un hold stable.`
      );
      return;
    }

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expirée, reconnecte-toi.");
      setUploading(false);
      return;
    }

    const extension = file.name.split(".").pop() ?? "mp4";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("sessions").insert({
      user_id: user.id,
      video_url: path,
      progression,
      status: "processing",
      trim_start: trimStart,
      trim_end: trimEnd,
    });

    setUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    handleRemoveVideo();
    setStep("figure");
    router.refresh();
  }

  if (step === "figure") {
    return (
      <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">
          Quelle figure veux-tu analyser ?
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {FIGURES.map((f) => {
            const selected = figure === f.value;
            return (
              <button
                key={f.value}
                type="button"
                disabled={!f.available}
                onClick={() => setFigure(f.value)}
                className={`relative rounded-lg border p-4 text-left transition-colors ${
                  !f.available
                    ? "cursor-not-allowed border-slate-800 bg-slate-800/40 text-slate-600"
                    : selected
                    ? "border-sky-500 bg-sky-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600"
                }`}
              >
                <span className="font-medium">{f.label}</span>
                {!f.available && (
                  <span className="mt-1 block text-xs text-slate-500">
                    Bientôt disponible
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setStep("details")}
          className="w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-600 py-2.5 font-medium text-white"
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep("figure")}
          className="text-xs text-slate-400 hover:text-slate-300"
        >
          ← Changer de figure
        </button>
        {file && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleChangeVideo}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
            >
              Changer de vidéo
            </button>
            <button
              type="button"
              onClick={handleRemoveVideo}
              aria-label="Supprimer la vidéo"
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-800"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      <h2 className="text-lg font-semibold text-white">
        Uploader un hold — Planche
      </h2>

      <select
        value={progression}
        onChange={(e) => setProgression(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-sky-500"
      >
        {PROGRESSIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className={
          file
            ? "hidden"
            : "w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-200 hover:file:bg-slate-700"
        }
      />

      {videoUrl && duration !== null && (
        <div className="space-y-3">
          <video
            ref={previewVideoRef}
            src={videoUrl}
            controls
            playsInline
            className="w-full rounded-lg border border-slate-800"
          />

          <div>
            <p className="mb-2 text-xs text-slate-500">
              Sélectionne uniquement le passage à analyser (ignore la mise en
              place et la sortie de figure)
            </p>
            <div className="relative h-6">
              <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-slate-700" />
              <div
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
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
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={uploading || !file}
        className="w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-600 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {uploading ? "Envoi en cours..." : "Envoyer"}
      </button>
    </form>
  );
}
