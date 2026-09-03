"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { runPoseAnalysis, type PoseAnalysisResult } from "@/lib/pose/runAnalysis";
import { downloadBlob } from "@/lib/pose/exportVideo";
import { compressVideoSegment } from "@/lib/video/compress";
import type { PoseAngles } from "@/lib/pose/angles";
import { isRepProgression } from "@/lib/pose/grid";
import type { Progression, RepProgression } from "@/lib/pose/grid";
import CaptureTipsModal, { shouldSkipTips } from "./CaptureTipsModal";
import ResultCard from "./ResultCard";
import ExportVideoButton from "./ExportVideoButton";
import { PROGRESSION_LABELS, figureFromProgression } from "@/lib/pose/report";
import {
  UploadCloudIcon,
  CameraIcon,
  CameraFlipIcon,
  ChangeVideoIcon,
  TrashIcon,
  DownloadIcon,
  CheckCircleIcon,
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
  DragonFlagFigureIcon,
  TuckDragonFlagIcon,
  StraddleDragonFlagIcon,
  FullDragonFlagIcon,
  HumanFlagFigureIcon,
  TuckHumanFlagIcon,
  StraddleHumanFlagIcon,
  FullHumanFlagIcon,
  PullUpFigureIcon,
  DipFigureIcon,
  PushUpFigureIcon,
  PistolFigureIcon,
  HoldTypeIcon,
  PressTypeIcon,
  PushUpTypeIcon,
} from "@/components/figureIcons";

type Figure =
  | "planche"
  | "handstand"
  | "front_lever"
  | "dragon_flag"
  | "human_flag"
  // Exercices à répétition : notés sur une série, pas sur une position tenue.
  | "traction"
  | "dips"
  | "pompes"
  | "pistol";
type ExerciseType = "hold" | "press" | "push_up";
// handstand_push_up en est sorti : c'est désormais une vraie progression, du
// côté des exercices à répétition. Ne reste ici que ce qui n'a pas encore de
// notation.
type HandstandVariation = "one_arm_handstand";
// one_leg_front_lever a rejoint Progression (grid.ts) le 2026-09-01, il
// n'est donc plus un simple libellé sans scoring.
type FrontLeverPlaceholderVariation = "one_arm_front_lever";
type Variation =
  | Progression
  | RepProgression
  | HandstandVariation
  | FrontLeverPlaceholderVariation;

const FIGURES: {
  value: Figure;
  label: string;
  // Nature du geste, en deux mots. Sert à séparer une figure d'une variation
  // au premier coup d'œil : la figure dit quel mouvement on travaille, la
  // variation dit à quel stade on en est.
  tagline: string;
  available: boolean;
  Icon: typeof PlancheFigureIcon;
  image?: string;
}[] = [
  {
    value: "planche",
    label: "Planche",
    tagline: "Poussée horizontale",
    available: true,
    Icon: PlancheFigureIcon,
    image: "/figures/planche.png",
  },
  {
    value: "handstand",
    label: "Handstand",
    tagline: "Équilibre inversé",
    available: true,
    Icon: HandstandFigureIcon,
    image: "/figures/handstand.png",
  },
  {
    value: "front_lever",
    // Réactivé le 2026-08-31 à la demande de l'utilisateur, qui a
    // commencé à soumettre des échantillons via /calibration. Les seuils
    // de grid.ts restent néanmoins DRAFT (entièrement raisonnés, pas
    // encore recalibrés sur données réelles, voir le commentaire au-dessus
    // de tuck_front_lever) : les scores affichés sont donc à prendre avec
    // prudence tant que la recalibration n'a pas été faite. Suivre la
    // justesse dans le bloc "Justesse de la grille" de /calibration.
    label: "Front Lever",
    tagline: "Traction horizontale",
    available: true,
    Icon: FrontLeverFigureIcon,
    image: "/figures/full-front-lever.png",
  },
  {
    value: "dragon_flag",
    label: "Dragon Flag",
    tagline: "Gainage renversé",
    available: true,
    Icon: DragonFlagFigureIcon,
    image: "/figures/dragon-flag.png",
  },
  {
    value: "human_flag",
    label: "Drapeau",
    tagline: "Gainage latéral",
    available: true,
    Icon: HumanFlagFigureIcon,
    image: "/figures/human-flag.png",
  },
  {
    value: "traction",
    label: "Traction",
    tagline: "Tirage vertical",
    available: true,
    Icon: PullUpFigureIcon,
    image: "/figures/strict-pull-up.png",
  },
  {
    value: "dips",
    label: "Dips",
    tagline: "Poussée verticale",
    available: true,
    Icon: DipFigureIcon,
  },
  {
    value: "pompes",
    label: "Pompes",
    tagline: "Poussée horizontale",
    available: true,
    Icon: PushUpFigureIcon,
    image: "/figures/push-up.png",
  },
  {
    value: "pistol",
    label: "Pistol Squat",
    tagline: "Jambes, unilatéral",
    available: true,
    Icon: PistolFigureIcon,
    image: "/figures/pistol-squat.png",
  },
];

type VariationOption = {
  value: Variation;
  label: string;
  // Ce qui définit la position, en une ligne. C'est le seul moyen fiable de
  // distinguer les variations entre elles : de profil et à la taille d'une
  // vignette, une straddle et une full planche sont deux silhouettes quasi
  // identiques. La description tranche là où l'illustration ne peut pas.
  cue: string;
  Icon: typeof TuckPlancheIcon;
  available: boolean;
  image?: string;
};

const VARIATIONS_BY_FIGURE: Record<Figure, VariationOption[]> = {
  planche: [
    {
      value: "tuck_planche",
      label: "Tuck",
      cue: "Genoux ramenés contre la poitrine",
      Icon: TuckPlancheIcon,
      available: true,
      image: "/figures/tuck-planche.png",
    },
    {
      value: "advanced_tuck_planche",
      label: "Advanced tuck",
      cue: "Hanches ouvertes, genoux encore repliés",
      Icon: AdvancedTuckIcon,
      available: true,
      image: "/figures/advanced-tuck-planche.png",
    },
    {
      value: "straddle_planche",
      label: "Straddle",
      cue: "Jambes tendues et écartées",
      Icon: StraddlePlancheIcon,
      available: true,
      image: "/figures/straddle-planche.png",
    },
    {
      value: "full_planche",
      label: "Full",
      cue: "Corps entièrement tendu à l’horizontale",
      Icon: FullPlancheIcon,
      available: true,
      image: "/figures/planche.png",
    },
  ],
  handstand: [
    {
      value: "handstand",
      label: "Handstand",
      cue: "Corps aligné en équilibre sur les mains",
      Icon: HandstandFigureIcon,
      available: true,
      image: "/figures/handstand.png",
    },
    {
      value: "handstand_push_up",
      label: "Handstand Push-up",
      cue: "Flexion complète des bras en équilibre, corps gainé",
      Icon: HandstandPushUpIcon,
      available: true,
    },
    { value: "one_arm_handstand", label: "One Arm Handstand", cue: "Équilibre tenu sur un seul bras", Icon: OneArmHandstandIcon, available: false },
  ],
  front_lever: [
    {
      value: "tuck_front_lever",
      label: "Tuck",
      cue: "Genoux ramenés contre la poitrine",
      Icon: TuckFrontLeverIcon,
      available: true,
      image: "/figures/tuck-front-lever.png",
    },
    {
      value: "advanced_tuck_front_lever",
      label: "Advanced tuck",
      cue: "Hanches ouvertes, genoux encore repliés",
      Icon: AdvancedTuckFrontLeverIcon,
      available: true,
      image: "/figures/advanced-tuck-front-lever.png",
    },
    // Ordre de difficulté croissante : la Single Leg se situe entre
    // l'advanced tuck et le straddle.
    {
      value: "one_leg_front_lever",
      label: "Single Leg",
      cue: "Une jambe tendue, l’autre repliée",
      Icon: OneLegFrontLeverIcon,
      available: true,
      image: "/figures/one-leg-front-lever.png",
    },
    {
      value: "straddle_front_lever",
      label: "Straddle",
      cue: "Jambes tendues et écartées",
      Icon: StraddleFrontLeverIcon,
      available: true,
    },
    {
      value: "full_front_lever",
      label: "Full",
      cue: "Corps entièrement tendu sous la barre",
      Icon: FullFrontLeverIcon,
      available: true,
      image: "/figures/full-front-lever.png",
    },
    {
      value: "one_arm_front_lever",
      label: "One Arm",
      cue: "Suspendu par un seul bras",
      Icon: OneArmFrontLeverIcon,
      available: false,
    },
  ],
  // Dragon flag. Seuls trois paliers : contrairement à la planche ou au front
  // lever, la progression classique ne passe pas par un advanced tuck, elle va
  // directement du groupé à l'écarté puis au corps tendu.
  dragon_flag: [
    {
      value: "tuck_dragon_flag",
      label: "Tuck",
      cue: "Genoux repliés, le tronc descend d'un bloc",
      Icon: TuckDragonFlagIcon,
      available: true,
    },
    {
      value: "straddle_dragon_flag",
      label: "Straddle",
      cue: "Jambes tendues et écartées",
      Icon: StraddleDragonFlagIcon,
      available: true,
    },
    {
      value: "full_dragon_flag",
      label: "Full",
      cue: "Corps entièrement tendu, aucune cassure à la hanche",
      Icon: FullDragonFlagIcon,
      available: true,
      image: "/figures/dragon-flag.png",
    },
  ],

  // Drapeau. Même progression que le dragon flag : du groupé à l'écarté puis
  // au corps tendu, sans palier intermédiaire de type advanced tuck.
  human_flag: [
    {
      value: "tuck_human_flag",
      label: "Tuck",
      cue: "Genoux repliés, corps à l'horizontale contre le mât",
      Icon: TuckHumanFlagIcon,
      available: true,
    },
    {
      value: "straddle_human_flag",
      label: "Straddle",
      cue: "Jambes tendues et écartées",
      Icon: StraddleHumanFlagIcon,
      available: true,
    },
    {
      value: "full_human_flag",
      label: "Full",
      cue: "Corps entièrement tendu à l'horizontale",
      Icon: FullHumanFlagIcon,
      available: true,
      image: "/figures/human-flag.png",
    },
  ],

  // --- Exercices à répétition ---
  //
  // Notés sur une série et non sur une position tenue : quatre critères
  // communs à tous (extension, amplitude, contrôle, tempo), seuls les seuils
  // changent d'un mouvement à l'autre. Les paliers sont de vraies
  // progressions, choisies pour que la première soit accessible à quelqu'un
  // qui débute.
  traction: [
    {
      value: "australian_pull_up",
      label: "Australienne",
      cue: "Corps incliné sous une barre basse, pieds au sol",
      Icon: PullUpFigureIcon,
      available: true,
      image: "/figures/australian-pull-up.png",
    },
    {
      value: "strict_pull_up",
      label: "Stricte",
      cue: "Suspendu, sans élan, menton au-dessus de la barre",
      Icon: PullUpFigureIcon,
      available: true,
      image: "/figures/strict-pull-up.png",
    },
  ],
  dips: [
    {
      value: "bench_dip",
      label: "Sur banc",
      cue: "Mains derrière soi sur un banc, pieds au sol",
      Icon: DipFigureIcon,
      available: true,
    },
    {
      value: "parallel_dip",
      label: "Barres",
      cue: "Corps suspendu entre deux barres parallèles",
      Icon: DipFigureIcon,
      available: true,
    },
  ],
  pompes: [
    {
      value: "incline_push_up",
      label: "Inclinées",
      cue: "Mains surélevées, corps incliné",
      Icon: PushUpFigureIcon,
      available: true,
    },
    {
      value: "push_up",
      label: "Au sol",
      cue: "Corps gainé, parallèle au sol",
      Icon: PushUpFigureIcon,
      available: true,
      image: "/figures/push-up.png",
    },
    {
      value: "decline_push_up",
      label: "Déclinées",
      cue: "Pieds surélevés, charge reportée sur les épaules",
      Icon: PushUpFigureIcon,
      available: true,
    },
  ],
  pistol: [
    {
      value: "box_pistol_squat",
      label: "Sur boîte",
      cue: "Descente jusqu'à un appui, jambe libre tendue devant",
      Icon: PistolFigureIcon,
      available: true,
    },
    {
      value: "pistol_squat",
      label: "Complet",
      cue: "Descente complète sur une jambe, sans appui",
      Icon: PistolFigureIcon,
      available: true,
      image: "/figures/pistol-squat.png",
    },
  ],
};

// Intitulé de section : petites capitales espacées suivies d'un filet qui
// s'éteint. Donne une hiérarchie de page là où toutes les sections se
// ressemblaient, sans ajouter de poids visuel.
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {children}
      </p>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-slate-800 via-slate-800/40 to-transparent"
      />
    </div>
  );
}

// Sélecteur de variation.
//
// Il ne s'appelle plus "Variations" mais "Progression", et ce n'est pas
// qu'un mot : les variations d'une figure forment une suite ordonnée, de la
// plus accessible à la plus dure, et c'est cette information qui les
// distingue vraiment. Les silhouettes, elles, n'y arrivent pas — de profil
// et à la taille d'une vignette, une straddle et une full planche sont deux
// images presque identiques, et l'utilisateur ne pouvait pas choisir en
// regardant.
//
// D'où trois repères qui ne dépendent pas du dessin : un rail numéroté qui
// situe chaque étape dans la suite, une jauge de difficulté, et surtout une
// ligne de texte qui dit ce qui définit la position retenue.
function VariationRail({
  options,
  value,
  onChange,
}: {
  options: VariationOption[];
  value: Variation;
  onChange: (next: Variation) => void;
}) {
  const currentIndex = options.findIndex((o) => o.value === value);
  const current = options[currentIndex];
  const count = options.length;
  // Le rail relie les centres des pastilles, pas les bords de la grille :
  // il commence donc à un demi-pas du bord, quel que soit le nombre d'étapes.
  const halfStep = 50 / count;
  const progress =
    count > 1 ? (Math.max(0, currentIndex) / (count - 1)) * (100 - 2 * halfStep) : 0;

  return (
    <div className="space-y-3">
      <SectionHeading>Progression</SectionHeading>

      <div className="relative">
        <span
          aria-hidden
          className="absolute top-[22px] h-px bg-slate-800"
          style={{ left: `${halfStep}%`, right: `${halfStep}%` }}
        />
        <span
          aria-hidden
          className="absolute top-[22px] h-px bg-gradient-to-r from-cyan-500/40 to-cyan-400 transition-all duration-500 ease-out"
          style={{ left: `${halfStep}%`, width: `${progress}%` }}
        />

        <div
          className="relative grid gap-1"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {options.map((o, index) => {
            const selected = o.value === value;
            const reached = index <= currentIndex;
            return (
              <button
                key={o.value}
                type="button"
                disabled={!o.available}
                onClick={() => onChange(o.value)}
                className={`group flex flex-col items-center gap-1.5 rounded-xl px-0.5 pb-2 pt-2.5 transition-colors duration-200 ${
                  !o.available
                    ? "cursor-not-allowed"
                    : selected
                    ? "bg-cyan-400/[0.06]"
                    : "hover:bg-slate-800/40"
                }`}
              >
                <span
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300 ${
                    !o.available
                      ? "border-slate-800 bg-slate-950 text-slate-700"
                      : selected
                      ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.75)]"
                      : reached
                      ? "border-cyan-500/50 bg-slate-950 text-cyan-300"
                      : "border-slate-700 bg-slate-950 text-slate-500"
                  }`}
                >
                  {index + 1}
                </span>

                {o.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.image}
                    alt=""
                    className={`h-10 w-full object-contain transition-all duration-300 ${
                      !o.available
                        ? "opacity-25 grayscale"
                        : selected
                        ? "drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                        : "opacity-55 saturate-50 group-hover:opacity-85 group-hover:saturate-100"
                    }`}
                  />
                ) : (
                  <span className="flex h-10 items-center">
                    <o.Icon
                      className={`h-7 w-7 transition-colors ${
                        !o.available
                          ? "text-slate-700"
                          : selected
                          ? "text-cyan-400"
                          : "text-slate-500 group-hover:text-slate-400"
                      }`}
                    />
                  </span>
                )}

                <span
                  className={`text-center text-[11px] font-medium leading-tight ${
                    !o.available
                      ? "text-slate-600"
                      : selected
                      ? "text-white"
                      : "text-slate-400"
                  }`}
                >
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <div className="rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/30 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">{current.label}</p>
            <span className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Difficulté
              </span>
              <span className="flex items-end gap-[3px]">
                {options.map((o, index) => (
                  <span
                    key={o.value}
                    aria-hidden
                    className={`w-[3px] rounded-full transition-colors duration-300 ${
                      index <= currentIndex ? "bg-cyan-400" : "bg-slate-700"
                    }`}
                    // Barres croissantes : la jauge se lit d'un coup d'œil,
                    // même sans compter les segments.
                    style={{ height: `${7 + index * 2}px` }}
                  />
                ))}
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {current.cue}
          </p>
          {!current.available && (
            <p className="mt-2 inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              Bientôt disponible
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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

// "Aujourd'hui" au format YYYY-MM-DD attendu par <input type="date">, dans
// le fuseau LOCAL du navigateur — new Date().toISOString() convertit en
// UTC et peut donner la mauvaille date (ex. peu après minuit en France,
// en avance sur UTC).
function todayLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  // Source du fichier chargé : une vidéo importée peut avoir été filmée il
  // y a longtemps (import d'un backlog, vidéo Instagram...), contrairement
  // à un enregistrement caméra qui vient d'être filmé à l'instant — on ne
  // demande donc la date réelle que pour un import.
  const [fileSource, setFileSource] = useState<"import" | "camera" | null>(null);
  // Calculé une fois au montage (lazy initializer) plutôt qu'appelé pendant
  // le rendu (impur) — sert aussi de borne max pour le sélecteur de date.
  const [today] = useState(() => todayLocalDateString());
  const [performedAt, setPerformedAt] = useState<string>(today);

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
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  // L'enregistrement dans l'historique/la progression est désormais un
  // choix explicite (bouton), plus une sauvegarde automatique après
  // analyse — certaines vidéos sont juste un test qu'on ne veut pas garder.
  const [saved, setSaved] = useState(false);
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

  async function loadSelectedFile(selected: File, source: "import" | "camera") {
    setError(null);
    setResult(null);
    setSaveError(null);
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
    setFileSource(source);
    setPerformedAt(todayLocalDateString());
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await loadSelectedFile(selected, "import");
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
    setSaved(false);
    setFileSource(null);
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
      void loadSelectedFile(recordedFile, "camera");
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

    // On ne conserve que le segment analysé, ré-encodé à 1080p : téléverser
    // le clip d'origine en entier faisait dépasser la limite de 50 Mo par
    // fichier pour des vidéos dont le passage utile pèse quelques Mo, et
    // consommait le quota de stockage (1 Go) bien plus vite que nécessaire.
    let uploadFile = file;
    // Bornes à enregistrer : après découpe, le segment commence à 0. Sans
    // cette remise à zéro, la ré-analyse depuis l'historique chercherait
    // aux positions de la vidéo d'origine, en dehors du fichier stocké.
    let storedTrimStart = trimStart;
    let storedTrimEnd = trimEnd;

    setCompressing(true);
    setCompressionProgress(0);
    try {
      const compressed = await compressVideoSegment({
        file,
        rangeStart: trimStart,
        rangeEnd: trimEnd,
        onProgress: setCompressionProgress,
      });
      // Un ré-encodage plus lourd que l'original n'apporte rien : ça arrive
      // sur une vidéo déjà très compressée dont on garde presque tout.
      if (compressed && compressed.compressedBytes < compressed.originalBytes) {
        uploadFile = compressed.file;
        storedTrimStart = 0;
        storedTrimEnd = trimEnd - trimStart;
      }
    } catch {
      // Compression impossible (codec indisponible, vidéo illisible) : on
      // téléverse le fichier d'origine plutôt que de bloquer l'utilisateur.
    } finally {
      setCompressing(false);
    }

    const extension = uploadFile.name.split(".").pop() ?? "mp4";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, uploadFile);
    if (uploadError) {
      const isSizeError = /maximum allowed size/i.test(uploadError.message);
      setSaveError(
        isSizeError
          ? "Vidéo non sauvegardée : même après découpe, elle dépasse la limite de 50 Mo. Réduis la durée du segment analysé."
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
        trim_start: storedTrimStart,
        trim_end: storedTrimEnd,
        hold_duration_seconds: analysisResult.ok
          ? analysisResult.holdDurationSeconds
          : null,
        rep_count: analysisResult.ok ? analysisResult.repCount : null,
        performed_at: fileSource === "import" ? performedAt : null,
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
    setSaved(true);
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
    setSaved(false);
    setSaveError(null);
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

  async function handleSaveResult() {
    if (!result) return;
    await persist(result);
  }

  function handleCancelAnalysis() {
    analysisAbortRef.current?.abort();
  }

  // Rejoue la mesure sur la même vidéo sans jamais appeler persist() —
  // l'enregistrement reste un choix explicite via handleSaveResult. Si la
  // séance était déjà enregistrée (saved=true), ce nouveau résultat reste
  // volontairement non sauvegardable pour éviter de dupliquer la session
  // en base ; sinon le bouton "Enregistrer" reste disponible normalement.
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
        <SectionHeading>Figures</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
        {FIGURES.map((f, index) => {
          const selected = figure === f.value;
          // Nombre impair de figures : la dernière prend toute la largeur
          // plutôt que de laisser un trou dans la grille.
          const wide = FIGURES.length % 2 === 1 && index === FIGURES.length - 1;
          return (
            <button
              key={f.value}
              type="button"
              disabled={!f.available}
              onClick={() => selectFigure(f.value)}
              className={`group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                wide ? "col-span-2" : ""
              } ${
                !f.available
                  ? "cursor-not-allowed border-slate-800/60 bg-slate-900/40"
                  : selected
                  ? "border-cyan-400/60 bg-slate-900 shadow-[0_14px_34px_-14px_rgba(34,211,238,0.6)]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              {/* Halo derrière le sujet, révélé à la sélection. C'est lui qui
                  fait exister la figure choisie plutôt qu'un simple liseré. */}
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                  selected ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  background:
                    "radial-gradient(115% 85% at 50% 72%, rgba(34,211,238,0.30) 0%, rgba(34,211,238,0.09) 45%, transparent 74%)",
                }}
              />

              <div className={`relative ${wide ? "h-36" : "h-28"} w-full px-3 pt-3`}>
                {f.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.image}
                    alt=""
                    className={`h-full w-full object-contain transition-all duration-300 ${
                      !f.available
                        ? "opacity-30 grayscale"
                        : selected
                        ? "drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]"
                        : "opacity-60 saturate-50 group-hover:opacity-90 group-hover:saturate-100"
                    }`}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <f.Icon
                      className={`h-10 w-10 ${
                        selected ? "text-cyan-400" : "text-slate-600"
                      }`}
                    />
                  </div>
                )}
              </div>

              <div className="relative flex items-center gap-2.5 px-3.5 pb-3 pt-1">
                {/* Barre d'accent : marque la sélection sans épaissir le cadre */}
                <span
                  aria-hidden
                  className={`h-7 w-[3px] shrink-0 rounded-full transition-colors duration-300 ${
                    selected ? "bg-cyan-400" : "bg-slate-700 group-hover:bg-slate-600"
                  }`}
                />
                <span className="min-w-0">
                  <span
                    className={`block truncate text-[15px] font-semibold leading-tight ${
                      !f.available ? "text-slate-600" : selected ? "text-white" : "text-slate-300"
                    }`}
                  >
                    {f.label}
                  </span>
                  <span
                    className={`block truncate text-[11px] leading-tight ${
                      selected ? "text-cyan-300/80" : "text-slate-500"
                    }`}
                  >
                    {f.available ? f.tagline : "Bientôt disponible"}
                  </span>
                </span>
              </div>
            </button>
            );
          })}
        </div>
      </div>

      {figure && (
      <>
      <VariationRail
        options={VARIATIONS_BY_FIGURE[figure]}
        value={progression}
        onChange={setProgression}
      />

      {/* Masqué sur les exercices à répétition : leur type est implicite, et
          proposer « Hold » pour une traction n'aurait aucun sens. */}
      {!isRepProgression(progression) && (
      <div className="space-y-3">
        <SectionHeading>Types d&apos;exercice</SectionHeading>
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
      )}

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
            MP4, MOV, WebM · seul le segment que tu analyses est conservé dans
            l&apos;historique, allégé automatiquement
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
              {fileSource === "camera" && (
                <button
                  type="button"
                  onClick={() => file && downloadBlob(file, file.name)}
                  className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Enregistrer sur le téléphone
                </button>
              )}
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

          {fileSource === "import" && (
            <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-900 p-3">
              <label
                htmlFor="performed-at"
                className="text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Quand as-tu réalisé cette figure ?
              </label>
              <input
                id="performed-at"
                type="date"
                value={performedAt}
                max={today}
                onChange={(e) => setPerformedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500">
                Utilisé pour ton historique et ta progression — pratique si tu
                importes une vidéo filmée il y a un moment.
              </p>
            </div>
          )}

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
              {result.warning}
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
                repCount={result.repCount}
                figure={figureFromProgression(progression)}
              />
            </>
          )}

          {saveError && (
            <p className="text-xs text-red-400">
              Échec de l&apos;enregistrement : {saveError}
            </p>
          )}

          {result && !saved && !analyzing && (
            <button
              type="button"
              onClick={handleSaveResult}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-50"
            >
              {compressing
                ? `Préparation de la vidéo... ${compressionProgress}%`
                : saving
                ? "Enregistrement..."
                : "Enregistrer cette figure"}
            </button>
          )}

          {saved && (
            <p className="flex items-center justify-center gap-1.5 rounded-lg border border-green-800 bg-green-500/10 py-2.5 text-sm font-medium text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              Enregistré dans ton historique
            </p>
          )}

          {result && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleReanalyze}
                className="w-full rounded-lg border border-slate-700 py-2.5 font-medium text-slate-200 hover:border-slate-600"
              >
                Réanalyser cette vidéo
              </button>
              <p className="text-center text-xs text-slate-500">
                {saved
                  ? "Vérifie la cohérence du résultat, sans re-sauvegarder. Le score déjà enregistré dans l'historique n'est pas modifié."
                  : "Vérifie la cohérence du résultat avant de l'enregistrer."}
              </p>
            </div>
          )}

          {result && result.ok && (
            <ExportVideoButton
              videoRef={previewVideoRef}
              figureLabel={PROGRESSION_LABELS[progression] ?? progression}
              globalScoreValue={result.globalScoreValue}
              scores={result.scores}
              progression={progression as Progression}
              rangeStart={trimStart}
              rangeEnd={trimEnd}
              landmarksFrames={result.landmarksFrames}
              landmarksTimes={result.landmarksTimes}
              holdStartSeconds={result.holdStartSeconds}
              holdEndSeconds={result.holdEndSeconds}
              holdDurationSeconds={result.holdDurationSeconds}
              repTimes={result.repTimes}
              weakPointCue={result.recommendations[0]?.exercice ?? null}
            />
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
        </form>
      )}
      </>
      )}
    </div>
  );
}
