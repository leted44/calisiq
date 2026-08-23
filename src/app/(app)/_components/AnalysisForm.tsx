"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { runPoseAnalysis, type PoseAnalysisResult } from "@/lib/pose/runAnalysis";
import type { PoseAngles } from "@/lib/pose/angles";
import type { Progression } from "@/lib/pose/grid";
import CaptureTipsModal, { shouldSkipTips } from "./CaptureTipsModal";
import ResultCard from "./ResultCard";
import { UploadCloudIcon, CameraIcon, ChangeVideoIcon, TrashIcon } from "@/components/icons";
import {
  PlancheFigureIcon,
  HandstandFigureIcon,
  TuckPlancheIcon,
  AdvancedTuckIcon,
  StraddlePlancheIcon,
  FullPlancheIcon,
  HoldTypeIcon,
  PressTypeIcon,
  PushUpTypeIcon,
} from "@/components/figureIcons";

type Figure = "planche" | "handstand";
type ExerciseType = "hold" | "press" | "push_up";

const FIGURES: {
  value: Figure;
  label: string;
  available: boolean;
  Icon: typeof PlancheFigureIcon;
}[] = [
  { value: "planche", label: "Planche", available: true, Icon: PlancheFigureIcon },
  { value: "handstand", label: "Handstand", available: false, Icon: HandstandFigureIcon },
];

const PROGRESSIONS: { value: Progression; label: string; Icon: typeof TuckPlancheIcon }[] = [
  { value: "tuck_planche", label: "Tuck", Icon: TuckPlancheIcon },
  { value: "advanced_tuck_planche", label: "Advanced tuck", Icon: AdvancedTuckIcon },
  { value: "straddle_planche", label: "Straddle", Icon: StraddlePlancheIcon },
  { value: "full_planche", label: "Full", Icon: FullPlancheIcon },
];

const EXERCISE_TYPES: {
  value: ExerciseType;
  label: string;
  available: boolean;
  Icon: typeof HoldTypeIcon;
}[] = [
  { value: "hold", label: "Hold", available: true, Icon: HoldTypeIcon },
  { value: "press", label: "Press", available: false, Icon: PressTypeIcon },
  { value: "push_up", label: "Push-up", available: false, Icon: PushUpTypeIcon },
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

export default function AnalysisForm() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [figure, setFigure] = useState<Figure | null>(null);
  const [progression, setProgression] = useState(PROGRESSIONS[0].value);
  const [exerciseType, setExerciseType] = useState<ExerciseType>(
    EXERCISE_TYPES[0].value
  );

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [cameraMode, setCameraMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const [pendingAction, setPendingAction] = useState<"import" | "camera" | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [liveAngles, setLiveAngles] = useState<PoseAngles | null>(null);
  const [result, setResult] = useState<PoseAnalysisResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (cameraMode && cameraVideoRef.current && streamRef.current) {
      cameraVideoRef.current.srcObject = streamRef.current;
      cameraVideoRef.current.play().catch(() => {});
    }
  }, [cameraMode]);

  async function loadSelectedFile(selected: File) {
    setError(null);
    setResult(null);
    setSaveError(null);

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await loadSelectedFile(selected);
  }

  function handleRemoveVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setDuration(null);
    setTrimStart(0);
    setTrimEnd(0);
    setResult(null);
    setSaveError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function requestImport() {
    if (shouldSkipTips()) {
      fileInputRef.current?.click();
    } else {
      setPendingAction("import");
    }
  }

  function requestCamera() {
    if (shouldSkipTips()) {
      openCamera();
    } else {
      setPendingAction("camera");
    }
  }

  function confirmTips() {
    const action = pendingAction;
    setPendingAction(null);
    if (action === "import") fileInputRef.current?.click();
    if (action === "camera") openCamera();
  }

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraMode(true);
    } catch (err) {
      setError("Impossible d'accéder à la caméra : " + (err as Error).message);
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraMode(false);
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || "video/webm",
      });
      const recordedFile = new File([blob], `enregistrement-${Date.now()}.webm`, {
        type: blob.type,
      });
      closeCamera();
      void loadSelectedFile(recordedFile);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setRecordSeconds(0);
    recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
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

  async function persist(analysisResult: PoseAnalysisResult) {
    if (!file) return;

    setSaving(true);
    setSaveError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveError("Session expirée, reconnecte-toi.");
      setSaving(false);
      return;
    }

    const extension = file.name.split(".").pop() ?? "mp4";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("videos").upload(path, file);
    if (uploadError) {
      setSaveError(uploadError.message);
      setSaving(false);
      return;
    }

    const { data: session, error: insertError } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        video_url: path,
        progression,
        status: analysisResult.ok ? "done" : "error",
        trim_start: trimStart,
        trim_end: trimEnd,
      })
      .select("id")
      .single();

    if (insertError || !session) {
      setSaveError(insertError?.message ?? "Erreur lors de l'enregistrement.");
      setSaving(false);
      return;
    }

    if (analysisResult.ok) {
      await supabase.from("scores").insert(
        analysisResult.scores.map((s) => ({
          session_id: session.id,
          critere: s.critere,
          score: s.score,
          valeur_mesuree: s.valeurMesuree,
          valeur_cible: s.valeurCible,
        }))
      );

      if (analysisResult.recommendations.length > 0) {
        await supabase.from("recommendations").insert(
          analysisResult.recommendations.map((r) => ({
            session_id: session.id,
            exercice: r.exercice,
            raison: r.raison,
          }))
        );
      }
    }

    setSaving(false);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file || !duration || !previewVideoRef.current || !canvasRef.current) {
      setError("Choisis ou filme une vidéo.");
      return;
    }

    if (trimEnd - trimStart < MIN_TRIM_SECONDS) {
      setError(
        `Le segment sélectionné est trop court : il faut au moins ${MIN_TRIM_SECONDS}s pour capturer un hold stable.`
      );
      return;
    }

    if (exerciseType !== "hold") {
      setError("Ce type d'exercice n'est pas encore disponible.");
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setProgressPercent(0);

    try {
      const analysisResult = await runPoseAnalysis({
        video: previewVideoRef.current,
        canvas: canvasRef.current,
        progression,
        rangeStart: trimStart,
        rangeEnd: trimEnd,
        onProgress: setProgressPercent,
        onLiveAngles: setLiveAngles,
      });

      setAnalyzing(false);
      setResult(analysisResult);
      await persist(analysisResult);
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
      setError("L'analyse a échoué : " + (err as Error).message);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {pendingAction && (
        <CaptureTipsModal
          onContinue={confirmTips}
          onClose={() => setPendingAction(null)}
        />
      )}

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Figure
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FIGURES.map((f) => {
            const selected = figure === f.value;
            return (
              <button
                key={f.value}
                type="button"
                disabled={!f.available}
                onClick={() => setFigure(figure === f.value ? null : f.value)}
                className={`relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                  !f.available
                    ? "cursor-not-allowed border-slate-800 bg-slate-800/40 text-slate-600"
                    : selected
                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600"
                }`}
              >
                <f.Icon className={`h-9 w-9 ${selected ? "text-cyan-400" : ""}`} />
                <span className="font-medium">{f.label}</span>
                {!f.available && (
                  <span className="block text-xs text-slate-500">
                    Bientôt disponible
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {figure && (
      <>
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Variation
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PROGRESSIONS.map((p) => {
            const selected = progression === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setProgression(p.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors ${
                  selected
                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                <p.Icon className={`h-8 w-8 ${selected ? "text-cyan-400" : ""}`} />
                <span className="text-xs font-medium">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Type d&apos;exercice
        </p>
        <div className="grid grid-cols-3 gap-2">
          {EXERCISE_TYPES.map((t) => {
            const selected = exerciseType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                disabled={!t.available}
                onClick={() => setExerciseType(t.value)}
                className={`relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                  !t.available
                    ? "cursor-not-allowed border-slate-800 bg-slate-800/40 text-slate-600"
                    : selected
                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                <t.Icon className={`h-5 w-5 ${selected ? "text-cyan-400" : ""}`} />
                <span className="text-xs font-medium">{t.label}</span>
                {!t.available && (
                  <span className="block text-[10px] text-slate-500">Bientôt</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!videoUrl && !cameraMode && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Vidéo
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={requestImport}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-6 text-sm font-medium text-slate-200 hover:border-cyan-700"
            >
              <UploadCloudIcon className="h-7 w-7 text-cyan-400" />
              Importer
            </button>
            <button
              type="button"
              onClick={requestCamera}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-6 text-sm font-medium text-slate-200 hover:border-cyan-700"
            >
              <CameraIcon className="h-7 w-7 text-cyan-400" />
              Se filmer
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {cameraMode && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
            <video ref={cameraVideoRef} muted playsInline className="w-full -scale-x-100" />
            {recording && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {formatTime(recordSeconds)}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeCamera}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:border-slate-600"
            >
              Annuler
            </button>
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white"
              >
                Arrêter
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
              >
                Démarrer l&apos;enregistrement
              </button>
            )}
          </div>
        </div>
      )}

      {videoUrl && duration !== null && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Découpe
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
              >
                <ChangeVideoIcon className="h-3.5 w-3.5" />
                Changer
              </button>
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-red-400 hover:border-red-800"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-slate-800">
            <video ref={previewVideoRef} src={videoUrl} controls playsInline className="w-full" />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
            />
          </div>

          {!analyzing && !result && (
            <div>
              <p className="mb-2 text-xs text-slate-500">
                Sélectionne uniquement le passage à analyser
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
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {liveAngles && (
                <p className="font-mono text-xs text-slate-500">
                  coude: {liveAngles.elbowAngle.toFixed(0)}° · hanche:{" "}
                  {liveAngles.hipAngle.toFixed(0)}°
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {result && !result.ok && (
            <p className="rounded-lg bg-orange-500/10 p-2 text-xs text-orange-400">
              {result.warning} Ta vidéo est tout de même enregistrée dans
              l&apos;historique.
            </p>
          )}

          {result && result.ok && (
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
              Analyse calculée mais non sauvegardée : {saveError}
            </p>
          )}

          {!result && !analyzing && (
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-50"
            >
              Analyser
            </button>
          )}

          {analyzing && (
            <button
              type="button"
              disabled
              className="w-full rounded-lg bg-slate-800 py-2.5 font-medium text-slate-400"
            >
              Analyse en cours...
            </button>
          )}

          {result && (
            <button
              type="button"
              onClick={handleRemoveVideo}
              className="w-full rounded-lg border border-slate-700 py-2.5 font-medium text-slate-200 hover:border-slate-600"
            >
              Nouvelle analyse
            </button>
          )}

          {saving && (
            <p className="text-center text-xs text-slate-500">Enregistrement...</p>
          )}
        </form>
      )}
      </>
      )}
    </div>
  );
}
