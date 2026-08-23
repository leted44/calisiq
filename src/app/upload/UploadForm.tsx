"use client";

import { useRef, useState } from "react";
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

const MIN_DURATION_SECONDS = 2;

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

export default function UploadForm() {
  const router = useRouter();
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<"figure" | "details">("figure");
  const [figure, setFigure] = useState<Figure>("planche");
  const [progression, setProgression] = useState(PROGRESSIONS[0].value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fileInput = e.currentTarget.elements.namedItem(
      "video"
    ) as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choisis une vidéo.");
      return;
    }

    let duration: number;
    try {
      duration = await getVideoDuration(file);
    } catch {
      setError("Impossible de lire ce fichier vidéo. Essaie un autre fichier.");
      return;
    }

    if (duration < MIN_DURATION_SECONDS) {
      setError(
        `Vidéo trop courte (${duration.toFixed(1)}s) : il faut au moins ${MIN_DURATION_SECONDS}s pour capturer un hold stable.`
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
    });

    setUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    formRef.current?.reset();
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
      ref={formRef}
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <button
        type="button"
        onClick={() => setStep("figure")}
        className="text-xs text-slate-400 hover:text-slate-300"
      >
        ← Changer de figure
      </button>

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
        type="file"
        name="video"
        accept="video/*"
        required
        className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-200 hover:file:bg-slate-700"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-600 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {uploading ? "Envoi en cours..." : "Envoyer"}
      </button>
    </form>
  );
}
