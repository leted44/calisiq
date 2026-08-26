"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { runPoseAnalysis, type PoseAnalysisResult } from "@/lib/pose/runAnalysis";
import { downloadBlob } from "@/lib/pose/exportVideo";
import type { PoseAngles } from "@/lib/pose/angles";
import type { Progression } from "@/lib/pose/grid";
import CaptureTipsModal, { shouldSkipTips } from "./CaptureTipsModal";
import ResultCard from "./ResultCard";
import ExportVideoButton from "./ExportVideoButton";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import {
  UploadCloudIcon,
  CameraIcon,
  CameraFlipIcon,
  ChangeVideoIcon,
  TrashIcon,
  DownloadIcon,
} from "@/components/icons";
import {
  PlancheFigureIcon,
  HandstandFigureIcon,
  FrontLeverFigureIcon,
  TuckPlancheIcon,
  AdvancedTuckIcon,
  StraddlePlancheIcon,
  FullPlancheIcon,
  HandstandPushUpIcon,
  OneArmHandstandIcon,
  TuckFrontLeverIcon,
  AdvancedTuckFrontLeverIcon,
  StraddleFrontLeverIcon,
  FullFrontLeverIcon,
  OneLegFrontLeverIcon,
  OneArmFrontLeverIcon,
  HoldTypeIcon,
  PressTypeIcon,
  PushUpTypeIcon,
} from "@/components/figureIcons";

type Figure = "planche" | "handstand" | "front_lever";
type ExerciseType = "hold" | "press" | "push_up";
type HandstandVariation = "handstand_push_up" | "one_arm_handstand";
type FrontLeverPlaceholderVariation = "one_leg_front_lever" | "one_arm_front_lever";
type Variation = Progression | HandstandVariation | FrontLeverPlaceholderVariation;

const FIGURES: {
  value: Figure;
  label: string;
  available: boolean;
  Icon: typeof PlancheFigureIcon;
  image?: string;
}[] = [
  {
    value: "planche",
    label: "Planche",
    available: true,
    Icon: PlancheFigureIcon,
    image: "/figures/planche.png",
  },
  {
    value: "handstand",
    label: "Handstand",
    available: true,
    Icon: HandstandFigureIcon,
    image: "/figures/handstand.png",
  },
  {
    value: "front_lever",
    label: "Front Lever",
    available: true,
    Icon: FrontLeverFigureIcon,
  },
];

type VariationOption = {
  value: Variation;
  label: string;
  Icon: typeof TuckPlancheIcon;
  available: boolean;
  image?: string;
};

const VARIATIONS_BY_FIGURE: Record<Figure, VariationOption[]> = {
  planche: [
    {
      value: "tuck_planche",
      label: "Tuck",
      Icon: TuckPlancheIcon,
      available: true,
      image: "/figures/tuck-planche.png",
    },
    {
      value: "advanced_tuck_planche",
      label: "Advanced tuck",
      Icon: AdvancedTuckIcon,
      available: true,
      image: "/figures/advanced-tuck-planche.png",
    },
    {
      value: "straddle_planche",
      label: "Straddle",
      Icon: StraddlePlancheIcon,
      available: true,
      image: "/figures/straddle-planche.png",
    },
    {
      value: "full_planche",
      label: "Full",
      Icon: FullPlancheIcon,
      available: true,
      image: "/figures/planche.png",
    },
  ],
  handstand: [
    {
      value: "handstand",
      label: "Handstand",
      Icon: HandstandFigureIcon,
      available: true,
      image: "/figures/handstand.png",
    },
    { value: "handstand_push_up", label: "Handstand Push-up", Icon: HandstandPushUpIcon, available: false },
    { value: "one_arm_handstand", label: "One Arm Handstand", Icon: OneArmHandstandIcon, available: false },
  ],
  front_lever: [
    {
      value: "tuck_front_lever",
      label: "Tuck",
      Icon: TuckFrontLeverIcon,
      available: true,
    },
    {
      value: "advanced_tuck_front_lever",
      label: "Advanced tuck",
      Icon: AdvancedTuckFrontLeverIcon,
      available: true,
    },
    {
      value: "straddle_front_lever",
      label: "Straddle",
      Icon: StraddleFrontLeverIcon,
      available: true,
    },
    {
      value: "full_front_lever",
      label: "Full",
      Icon: FullFrontLeverIcon,
      available: true,
    },
    {
      value: "one_leg_front_lever",
      label: "One Leg",
      Icon: OneLegFrontLeverIcon,
      available: false,
    },
    {
      value: "one_arm_front_lever",
      label: "One Arm",
      Icon: OneArmFrontLeverIcon,
      available: false,
    },
  ],
};

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

type RecordingQuality = "720p" | "1080p" | "4k";

const QUALITY_PRESETS: Record<RecordingQuality, { width: number; height: number; bitrate: number }> = {
  "720p": { width: 1280, height: 720, bitrate: 4_000_000 },
  "1080p": { width: 1920, height: 1080, bitrate: 8_000_000 },
  "4k": { width: 3840, height: 2160, bitrate: 25_000_000 },
};

// L'API de zoom caméra (MediaTrackCapabilities.zoom) est non-standard et
// absente des types TS du DOM — présente sur Chrome Android, pas partout.
// Le retour de getCapabilities() est casté directement (plutôt que de
// retyper la méthode par intersection) car TS fusionne sinon les deux
// signatures de getCapabilities et perd le champ zoom ajouté.
type ZoomCapabilities = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step: number };
};

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
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);

  const [figure, setFigure] = useState<Figure | null>(null);
  const [progression, setProgression] = useState<Variation>(
    VARIATIONS_BY_FIGURE.planche[0].value
  );
  const [exerciseType, setExerciseType] = useState<ExerciseType>(
    EXERCISE_TYPES[0].value
  );

  function selectFigure(next: Figure) {
    setFigure((current) => {
      if (current === next) return null;
      setProgression(VARIATIONS_BY_FIGURE[next][0].value);
      return next;
    });
  }

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [cameraMode, setCameraMode] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [quality, setQuality] = useState<RecordingQuality>("1080p");
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(
    null
  );
  const [zoom, setZoom] = useState(1);

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

  async function startStream(mode: "user" | "environment", exact: boolean, q: RecordingQuality) {
    // La caméra précédente doit être libérée avant d'en demander une
    // nouvelle : sur mobile, deux flux caméra actifs en même temps
    // font souvent planter ou bloquer la nouvelle requête.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const preset = QUALITY_PRESETS[q];
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: exact ? { exact: mode } : mode,
        width: { ideal: preset.width },
        height: { ideal: preset.height },
      },
      audio: false,
    });
    streamRef.current = stream;
    setFacingMode(mode);
    setQuality(q);

    const track = stream.getVideoTracks()[0] as MediaStreamTrack | undefined;
    const capabilities = track?.getCapabilities?.() as ZoomCapabilities | undefined;
    if (capabilities?.zoom) {
      setZoomRange(capabilities.zoom);
      setZoom(capabilities.zoom.min);
    } else {
      setZoomRange(null);
      setZoom(1);
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = stream;
      await cameraVideoRef.current.play().catch(() => {});
    }
  }

  async function openCamera() {
    setError(null);
    try {
      await startStream(facingMode, false, quality);
      setCameraMode(true);
    } catch (err) {
      setError("Impossible d'accéder à la caméra : " + (err as Error).message);
    }
  }

  async function flipCamera() {
    setError(null);
    const nextMode = facingMode === "user" ? "environment" : "user";
    try {
      // "exact" force un vrai changement de caméra ; sans ça certains
      // navigateurs renvoient silencieusement la même caméra qu'avant.
      await startStream(nextMode, true, quality);
    } catch {
      setError("Aucune autre caméra disponible sur cet appareil.");
      try {
        await startStream(facingMode, false, quality);
      } catch {
        // la caméra précédente ne peut pas être restaurée, l'utilisateur
        // devra fermer et rouvrir "Se filmer"
      }
    }
  }

  async function changeQuality(newQuality: RecordingQuality) {
    if (recording) return; // pas de changement de résolution pendant l'enregistrement
    setError(null);
    if (!cameraMode) {
      setQuality(newQuality);
      return;
    }
    try {
      await startStream(facingMode, false, newQuality);
    } catch {
      setError("Impossible de changer la qualité — réessaie ou choisis une résolution plus basse.");
    }
  }

  async function handleZoomChange(value: number) {
    setZoom(value);
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
    } catch {
      // certains navigateurs refusent le changement en direct, on ignore
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraMode(false);
    setRecording(false);
    setCountdown(null);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  }

  function beginCountdown() {
    let remaining = 5;
    setCountdown(remaining);
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        startRecording();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    // MP4 en priorité : format lisible partout (galerie photo du téléphone,
    // partage direct) sans passer par une conversion. WebM en repli pour
    // les navigateurs qui ne savent pas encoder de MP4 (ex. Firefox desktop).
    const mimeCandidates = [
      "video/mp4;codecs=avc1.42E01E",
      "video/mp4;codecs=h264",
      "video/mp4",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: QUALITY_PRESETS[quality].bitrate,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const finalType = recorder.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type: finalType });
      const extension = finalType.includes("mp4") ? "mp4" : "webm";
      const recordedFile = new File([blob], `enregistrement-${Date.now()}.${extension}`, {
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
      const isSizeError = /maximum allowed size/i.test(uploadError.message);
      setSaveError(
        isSizeError
          ? "Vidéo non sauvegardée : elle dépasse la limite de stockage actuelle (50 Mo)."
          : uploadError.message
      );
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
        hold_duration_seconds: analysisResult.ok
          ? analysisResult.holdDurationSeconds
          : null,
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

    if (exerciseType !== "hold" || !variationAvailable) {
      setError("Cette combinaison figure/variation n'est pas encore disponible.");
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setProgressPercent(0);

    const controller = new AbortController();
    analysisAbortRef.current = controller;

    try {
      const analysisResult = await runPoseAnalysis({
        video: previewVideoRef.current,
        canvas: canvasRef.current,
        progression: progression as Progression,
        rangeStart: trimStart,
        rangeEnd: trimEnd,
        onProgress: setProgressPercent,
        onLiveAngles: setLiveAngles,
        signal: controller.signal,
      });

      setAnalyzing(false);
      setResult(analysisResult);
      await persist(analysisResult);
    } catch (err) {
      setAnalyzing(false);
      if ((err as Error).name === "AbortError") {
        setProgressPercent(0);
        return;
      }
      console.error(err);
      setError("L'analyse a échoué : " + (err as Error).message);
    }
  }

  function handleCancelAnalysis() {
    analysisAbortRef.current?.abort();
  }

  // Rejoue la mesure sur la même vidéo sans re-sauvegarder — contrairement à
  // handleSubmit, n'appelle pas persist() pour éviter de dupliquer la
  // session et l'upload vidéo dans l'historique. Sert juste à vérifier
  // qu'il n'y a pas eu d'erreur ponctuelle sur la première analyse.
  async function handleReanalyze() {
    setError(null);
    if (!previewVideoRef.current || !canvasRef.current) return;

    setAnalyzing(true);
    setResult(null);
    setProgressPercent(0);

    const controller = new AbortController();
    analysisAbortRef.current = controller;

    try {
      const analysisResult = await runPoseAnalysis({
        video: previewVideoRef.current,
        canvas: canvasRef.current,
        progression: progression as Progression,
        rangeStart: trimStart,
        rangeEnd: trimEnd,
        onProgress: setProgressPercent,
        onLiveAngles: setLiveAngles,
        signal: controller.signal,
      });

      setAnalyzing(false);
      setResult(analysisResult);
    } catch (err) {
      setAnalyzing(false);
      if ((err as Error).name === "AbortError") {
        setProgressPercent(0);
        return;
      }
      console.error(err);
      setError("L'analyse a échoué : " + (err as Error).message);
    }
  }

  const variationAvailable = figure
    ? VARIATIONS_BY_FIGURE[figure].some((v) => v.value === progression && v.available)
    : false;

  return (
    <div className="w-full max-w-md space-y-6">
      {pendingAction && (
        <CaptureTipsModal
          onContinue={confirmTips}
          onClose={() => setPendingAction(null)}
          isStraddle={progression === "straddle_planche" || progression === "straddle_front_lever"}
        />
      )}

      {/* Toujours monté (même vidéo déjà chargée) pour que "Changer" dans
          la section Découpe puisse toujours déclencher le sélecteur. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Figures
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FIGURES.map((f) => {
            const selected = figure === f.value;
            return (
              <button
                key={f.value}
                type="button"
                disabled={!f.available}
                onClick={() => selectFigure(f.value)}
                className={`relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                  !f.available
                    ? "cursor-not-allowed border-slate-800 bg-slate-800/40 text-slate-600"
                    : selected
                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600"
                }`}
              >
                {f.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.image}
                    alt={f.label}
                    className={`h-24 w-full object-contain ${
                      selected ? "drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" : ""
                    }`}
                  />
                ) : (
                  <f.Icon
                    className={`h-9 w-9 ${
                      selected ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]" : ""
                    }`}
                  />
                )}
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
          Variations
        </p>
        <div className={`grid gap-2 ${figure === "planche" ? "grid-cols-4" : "grid-cols-3"}`}>
          {VARIATIONS_BY_FIGURE[figure].map((v) => {
            const selected = progression === v.value;
            return (
              <button
                key={v.value}
                type="button"
                disabled={!v.available}
                onClick={() => setProgression(v.value)}
                className={`relative flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors ${
                  !v.available
                    ? "cursor-not-allowed border-slate-800 bg-slate-800/40 text-slate-600"
                    : selected
                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                {v.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.image}
                    alt={v.label}
                    className={`h-12 w-full object-contain ${
                      selected && v.available
                        ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                        : ""
                    }`}
                  />
                ) : (
                  <v.Icon
                    className={`h-8 w-8 ${
                      selected && v.available
                        ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                        : ""
                    }`}
                  />
                )}
                <span className="text-xs font-medium">{v.label}</span>
                {!v.available && (
                  <span className="block text-[10px] text-slate-500">Bientôt</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Types d&apos;exercice
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

      {!variationAvailable && !videoUrl && (
        <p className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-400">
          L&apos;analyse pour cette variation n&apos;est pas encore disponible —
          ses critères de score sont en cours de calibration.
        </p>
      )}

      {variationAvailable && !videoUrl && !cameraMode && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Vidéo
          </p>
          <p className="text-xs text-slate-500">
            MP4, MOV, WebM · vidéo sauvegardée dans l&apos;historique si elle
            fait moins de 50 Mo
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
        </div>
      )}

      {cameraMode && (
        <div className="space-y-3">
          {!recording && countdown === null && (
            <div className="flex gap-2">
              {(["720p", "1080p", "4k"] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => changeQuality(q)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                    quality === q
                      ? "border-cyan-500 bg-cyan-500/10 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {q === "4k" ? "4K" : q}
                </button>
              ))}
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
            <video
              ref={cameraVideoRef}
              muted
              playsInline
              className={`w-full ${facingMode === "user" ? "-scale-x-100" : ""}`}
            />
            {recording && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {formatTime(recordSeconds)}
              </div>
            )}
            {!recording && countdown === null && (
              <button
                type="button"
                onClick={flipCamera}
                aria-label="Changer de caméra"
                className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              >
                <CameraFlipIcon className="h-5 w-5" />
              </button>
            )}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-7xl font-bold text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                  {countdown}
                </span>
              </div>
            )}
            {zoomRange && (
              <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
                <span className="text-xs font-medium text-white">Zoom</span>
                <input
                  type="range"
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={zoomRange.step || 0.1}
                  value={zoom}
                  onChange={(e) => handleZoomChange(Number(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
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
            ) : countdown !== null ? (
              <button
                type="button"
                disabled
                className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-slate-400"
              >
                Décompte : {countdown}s
              </button>
            ) : (
              <button
                type="button"
                onClick={beginCountdown}
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
                onClick={() => file && downloadBlob(file, file.name)}
                className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                Enregistrer
              </button>
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
                holdDurationSeconds={result.holdDurationSeconds}
                figure={figure ?? "planche"}
              />
              <ExportVideoButton
                videoRef={previewVideoRef}
                figureLabel={PROGRESSION_LABELS[progression] ?? progression}
                globalScoreValue={result.globalScoreValue}
                scores={result.scores}
                rangeStart={trimStart}
                rangeEnd={trimEnd}
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
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full rounded-lg bg-slate-800 py-2.5 font-medium text-slate-400"
              >
                Analyse en cours...
              </button>
              <button
                type="button"
                onClick={handleCancelAnalysis}
                className="w-full rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:border-red-800 hover:text-red-400"
              >
                Annuler l&apos;analyse
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleReanalyze}
                className="w-full rounded-lg border border-slate-700 py-2.5 font-medium text-slate-200 hover:border-slate-600"
              >
                Réanalyser cette vidéo
              </button>
              <p className="text-center text-xs text-slate-500">
                Vérifie la cohérence du résultat, sans re-sauvegarder. Le
                score déjà enregistré dans l&apos;historique n&apos;est pas
                modifié.
              </p>
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="w-full rounded-lg border border-slate-700 py-2.5 font-medium text-slate-200 hover:border-slate-600"
              >
                Nouvelle analyse
              </button>
            </div>
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
