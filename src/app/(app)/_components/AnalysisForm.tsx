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
import {
  progressionLabel,
  figureFromProgression,
  isCalibrated,
} from "@/lib/pose/report";
import {
  LockIcon,
  ApproximateIcon,
  StarIcon,
  ChevronDownIcon,
} from "@/components/icons";
import { useFavorites, toggleFavorite } from "./favorites";
import { useT, useLang } from "@/lib/i18n/client";
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
  OneLegDragonFlagIcon,
  FullDragonFlagIcon,
  HumanFlagFigureIcon,
  TuckHumanFlagIcon,
  OneLegHumanFlagIcon,
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
  // Nature du geste, en deux mots. Sert à séparer une figure d'une variation
  // au premier coup d'œil : la figure dit quel mouvement on travaille, la
  // variation dit à quel stade on en est.
  available: boolean;
  Icon: typeof PlancheFigureIcon;
  image?: string;
}[] = [
  {
    value: "planche",
    available: true,
    Icon: PlancheFigureIcon,
    image: "/figures/planche.png",
  },
  {
    value: "handstand",
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
    available: true,
    Icon: FrontLeverFigureIcon,
    image: "/figures/full-front-lever.png",
  },
  {
    value: "dragon_flag",
    available: true,
    Icon: DragonFlagFigureIcon,
    image: "/figures/dragon-flag.png",
  },
  {
    value: "human_flag",
    available: true,
    Icon: HumanFlagFigureIcon,
    image: "/figures/human-flag.png",
  },
  {
    value: "traction",
    available: true,
    Icon: PullUpFigureIcon,
    image: "/figures/strict-pull-up.png",
  },
  {
    value: "dips",
    available: true,
    Icon: DipFigureIcon,
    image: "/figures/parallel-dip.png",
  },
  {
    value: "pompes",
    available: true,
    Icon: PushUpFigureIcon,
    image: "/figures/push-up.png",
  },
  {
    value: "pistol",
    available: true,
    Icon: PistolFigureIcon,
    image: "/figures/pistol-squat.png",
  },
];

// Index inverses, construits une fois au chargement du module.
//
// Un favori est enregistré au niveau de la VARIATION et non de la figure :
// c'est la variation qu'on travaille pendant des semaines, et la retrouver
// d'un geste évite les deux sélections successives (figure, puis variation).
// Retrouver sa figure demande donc ce chemin de retour.
type VariationIndexEntry = { figure: Figure; option: VariationOption };

type VariationOption = {
  value: Variation;
  Icon: typeof TuckPlancheIcon;
  available: boolean;
  image?: string;
};

const VARIATIONS_BY_FIGURE: Record<Figure, VariationOption[]> = {
  planche: [
    {
      value: "tuck_planche",
      Icon: TuckPlancheIcon,
      available: true,
      image: "/figures/tuck-planche.png",
    },
    {
      value: "advanced_tuck_planche",
      Icon: AdvancedTuckIcon,
      available: true,
      image: "/figures/advanced-tuck-planche.png",
    },
    {
      value: "straddle_planche",
      Icon: StraddlePlancheIcon,
      available: true,
      image: "/figures/straddle-planche.png",
    },
    {
      value: "full_planche",
      Icon: FullPlancheIcon,
      available: true,
      image: "/figures/planche.png",
    },
  ],
  handstand: [
    {
      value: "handstand",
      Icon: HandstandFigureIcon,
      available: true,
      image: "/figures/handstand.png",
    },
    {
      value: "handstand_push_up",
      Icon: HandstandPushUpIcon,
      available: true,
      image: "/figures/handstand-push-up.png",
    },
    {
      value: "one_arm_handstand",
      Icon: OneArmHandstandIcon,
      available: false,
      image: "/figures/one-arm-handstand.png",
    },
  ],
  front_lever: [
    {
      value: "tuck_front_lever",
      Icon: TuckFrontLeverIcon,
      available: true,
      image: "/figures/tuck-front-lever.png",
    },
    {
      value: "advanced_tuck_front_lever",
      Icon: AdvancedTuckFrontLeverIcon,
      available: true,
      image: "/figures/advanced-tuck-front-lever.png",
    },
    // Ordre de difficulté croissante : la Single Leg se situe entre
    // l'advanced tuck et le straddle.
    {
      value: "one_leg_front_lever",
      Icon: OneLegFrontLeverIcon,
      available: true,
      image: "/figures/one-leg-front-lever.png",
    },
    {
      value: "straddle_front_lever",
      Icon: StraddleFrontLeverIcon,
      available: true,
      image: "/figures/straddle-front-lever.png",
    },
    {
      value: "full_front_lever",
      Icon: FullFrontLeverIcon,
      available: true,
      image: "/figures/full-front-lever.png",
    },
    {
      value: "one_arm_front_lever",
      Icon: OneArmFrontLeverIcon,
      available: false,
      image: "/figures/one-arm-front-lever.png",
    },
  ],
  // Dragon flag. Seuls trois paliers : contrairement à la planche ou au front
  // lever, la progression classique ne passe pas par un advanced tuck, elle va
  // directement du groupé à l'écarté puis au corps tendu.
  dragon_flag: [
    {
      value: "tuck_dragon_flag",
      Icon: TuckDragonFlagIcon,
      available: true,
      image: "/figures/tuck-dragon-flag.png",
    },
    {
      value: "one_leg_dragon_flag",
      Icon: OneLegDragonFlagIcon,
      available: true,
    },
    {
      value: "full_dragon_flag",
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
      Icon: TuckHumanFlagIcon,
      available: true,
    },
    {
      value: "one_leg_human_flag",
      Icon: OneLegHumanFlagIcon,
      available: true,
    },
    {
      value: "straddle_human_flag",
      Icon: StraddleHumanFlagIcon,
      available: true,
    },
    {
      value: "full_human_flag",
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
      Icon: PullUpFigureIcon,
      available: true,
      image: "/figures/australian-pull-up.png",
    },
    {
      value: "strict_pull_up",
      Icon: PullUpFigureIcon,
      available: true,
      image: "/figures/strict-pull-up.png",
    },
  ],
  dips: [
    {
      value: "bench_dip",
      Icon: DipFigureIcon,
      available: true,
      image: "/figures/bench-dip.png",
    },
    {
      value: "parallel_dip",
      Icon: DipFigureIcon,
      available: true,
      image: "/figures/parallel-dip.png",
    },
  ],
  pompes: [
    {
      value: "incline_push_up",
      Icon: PushUpFigureIcon,
      available: true,
      image: "/figures/incline-push-up.png",
    },
    {
      value: "push_up",
      Icon: PushUpFigureIcon,
      available: true,
      image: "/figures/push-up.png",
    },
    {
      value: "decline_push_up",
      Icon: PushUpFigureIcon,
      available: true,
      image: "/figures/decline-push-up.png",
    },
  ],
  pistol: [
    {
      value: "box_pistol_squat",
      Icon: PistolFigureIcon,
      available: true,
      image: "/figures/box-pistol-squat.png",
    },
    {
      value: "pistol_squat",
      Icon: PistolFigureIcon,
      available: true,
      image: "/figures/pistol-squat.png",
    },
  ],
};

const VARIATION_INDEX: Record<string, VariationIndexEntry> = Object.fromEntries(
  Object.entries(VARIATIONS_BY_FIGURE).flatMap(([figure, options]) =>
    options.map((option) => [option.value, { figure: figure as Figure, option }])
  )
);



// Marque d'état d'une figure, en pastille de coin.
//
// Deux états distincts, et il ne faut pas les confondre. Le cadenas dit que
// l'app ne sait pas analyser la figure du tout. Le signe « environ » dit
// qu'elle l'analyse, mais avec des seuils jamais validés sur des vidéos
// réelles : la note existe, elle est seulement approximative. Un cadenas sur
// ce second cas laisserait croire à tort que la figure est inutilisable.
function StatusBadge({
  state,
  size = "md",
}: {
  state: "locked" | "draft";
  size?: "sm" | "md";
}) {
  const t = useT();
  const box = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const glyph = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      title={
        state === "locked"
          ? t.analysis.notAnalysable
          : t.analysis.approximate
      }
      className={`flex ${box} items-center justify-center rounded-full border ${
        state === "locked"
          ? "border-slate-700 bg-slate-950 text-slate-500"
          : "border-amber-500/40 bg-amber-500/10 text-amber-400"
      }`}
    >
      {state === "locked" ? (
        <LockIcon className={glyph} />
      ) : (
        <ApproximateIcon className={glyph} />
      )}
    </span>
  );
}

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
  const t = useT();
  const favorites = useFavorites();
  const isFavorite = current ? favorites.includes(current.value) : false;
  // Le rail relie les centres des pastilles, pas les bords de la grille :
  // il commence donc à un demi-pas du bord, quel que soit le nombre d'étapes.
  const halfStep = 50 / count;
  const progress =
    count > 1 ? (Math.max(0, currentIndex) / (count - 1)) * (100 - 2 * halfStep) : 0;

  return (
    <div className="space-y-3">
      <SectionHeading>{t.analysis.progression}</SectionHeading>

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
                className={`group relative flex flex-col items-center gap-1.5 rounded-xl px-0.5 pb-2 pt-2.5 transition-colors duration-200 ${
                  !o.available
                    ? "cursor-not-allowed"
                    : selected
                    ? "bg-cyan-400/[0.06]"
                    : "hover:bg-slate-800/40"
                }`}
              >
                {/* Le badge est ancré à la pastille numérotée et non au coin du
                    bouton : la largeur d'un nœud varie de deux à six colonnes
                    selon la figure, et au coin il finissait par sembler
                    appartenir au nœud voisin. */}
                <span className="relative z-10">
                  {(!o.available || !isCalibrated(o.value)) && (
                    <span className="absolute -right-2 -top-1 z-20">
                      <StatusBadge
                        size="sm"
                        state={o.available ? "draft" : "locked"}
                      />
                    </span>
                  )}
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
                  {t.variations[o.value].label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {current && (
        <div className="rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/30 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {/* L'étoile est ici, sur la variation sélectionnée, et non sur
                  chaque tuile de figure. Les tuiles portent déjà une image,
                  un nom, une accroche et une pastille d'état ; une étoile de
                  plus sur chacune des neuf en ferait un tableau de bord. Ici
                  elle est unique, sans ambiguïté sur ce qu'elle marque, et
                  elle vise la variation, qui est ce qu'on travaille
                  réellement pendant des semaines. */}
              <button
                type="button"
                onClick={() => toggleFavorite(current.value)}
                aria-pressed={isFavorite}
                aria-label={
                  isFavorite
                    ? t.analysis.removeFavorite(t.variations[current.value].label)
                    : t.analysis.addFavorite(t.variations[current.value].label)
                }
                className={`-m-1.5 shrink-0 rounded-lg p-1.5 transition-colors ${
                  isFavorite
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                <StarIcon className="h-4 w-4" filled={isFavorite} />
              </button>
              <p className="truncate text-sm font-semibold text-white">
                {t.variations[current.value].label}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                {t.analysis.difficulty}
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
            {t.variations[current.value].cue}
          </p>
          {!current.available ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <LockIcon className="h-3.5 w-3.5 shrink-0" />
              {t.analysis.notAnalysableLong}
            </p>
          ) : (
            !isCalibrated(current.value) && (
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] leading-relaxed text-amber-400/90">
                <ApproximateIcon className="h-3.5 w-3.5 shrink-0" />
                {t.analysis.approximateLong}
              </p>
            )
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

// Le message d'erreur est passé en paramètre : cette fonction vit hors d'un
// composant, où aucun hook n'est utilisable, et y coder une langue en dur
// réintroduirait exactement le texte figé qu'on est en train de retirer.
function getVideoDuration(
  file: File,
  unreadableMessage: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error(unreadableMessage));
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

  // Favoris résolus vers leur figure et leur option. Un favori enregistré
  // pour une variation qui n'existerait plus est simplement ignoré, plutôt
  // que de faire planter l'accueil.
  const t = useT();
  const lang = useLang();
  // Ancre du défilement automatique et sonde de visibilité des actions.
  //
  // Avec neuf figures, la grille occupe plus d'un écran : choisir une figure
  // révélait la progression et les boutons d'import bien plus bas, hors du
  // champ de vision. Rien ne bougeait à l'écran, et l'utilisateur ne pouvait
  // pas savoir que quelque chose s'était passé.
  const progressionRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsVisible, setActionsVisible] = useState(true);
  const favorites = useFavorites();
  const favoriteEntries = favorites
    .map((value) => VARIATION_INDEX[value])
    .filter((entry): entry is VariationIndexEntry => entry !== undefined);

  function selectFigure(next: Figure) {
    setFigure((current) => {
      // Refermer une figure déjà ouverte ne doit pas déclencher de
      // défilement : il n'y a plus rien à montrer plus bas.
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
      videoDuration = await getVideoDuration(selected, t.analysis.errors.unreadableFile);
    } catch {
      setError(t.analysis.errors.unreadableVideo);
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

  // Défilement vers la progression, sur demande explicite.
  //
  // Il a d'abord été déclenché automatiquement à chaque sélection. Mauvaise
  // idée à l'usage : la page partait vers le bas dès qu'on touchait une
  // figure, et il fallait remonter pour en essayer une autre. Comparer deux
  // figures devenait pénible. Le geste reste donc à l'initiative de
  // l'utilisateur, depuis la barre ancrée.
  function scrollToProgression() {
    const cible = progressionRef.current;
    if (!cible) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cible.scrollIntoView({
      behavior: reduit ? "auto" : "smooth",
      block: "start",
    });
  }

  // Sonde la visibilité des boutons d'import : la barre ancrée ne s'affiche
  // que lorsqu'ils sont sortis de l'écran, pour ne pas doubler inutilement une
  // action déjà sous les yeux.
  useEffect(() => {
    const cible = actionsRef.current;
    if (!cible) {
      setActionsVisible(true);
      return;
    }
    const observateur = new IntersectionObserver(
      ([entree]) => setActionsVisible(entree.isIntersecting),
      { rootMargin: "-80px 0px -140px 0px" }
    );
    observateur.observe(cible);
    return () => observateur.disconnect();
  }, [figure, progression, videoUrl, cameraMode]);

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
      setError(t.analysis.errors.camera((err as Error).message));
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
      setError(t.analysis.errors.noOtherCamera);
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
      setError(t.analysis.errors.qualityChange);
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
      setSaveError(t.analysis.errors.sessionExpired);
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
          ? t.analysis.errors.tooLarge
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
      setError(t.analysis.errors.noVideo);
      return;
    }

    if (trimEnd - trimStart < MIN_TRIM_SECONDS) {
      setError(
        t.analysis.errors.segmentTooShort(MIN_TRIM_SECONDS)
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
        lang,
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
      setError(t.analysis.errors.analysisFailed((err as Error).message));
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
        lang,
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
      setError(t.analysis.errors.analysisFailed((err as Error).message));
    }
  }

  const variationAvailable = figure
    ? VARIATIONS_BY_FIGURE[figure].some((v) => v.value === progression && v.available)
    : false;

  return (
    <div
      className={`w-full max-w-md space-y-6 ${
        // Réserve la hauteur de la barre ancrée quand elle est affichée :
        // sans ça, elle recouvrirait les dernières figures de la grille et on
        // ne pourrait plus les atteindre.
        figure && variationAvailable && !videoUrl && !cameraMode && !actionsVisible ? "pb-32" : ""
      }`}
    >
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

      {favoriteEntries.length > 0 && (
        <div className="space-y-3">
          <SectionHeading>{t.analysis.favourites}</SectionHeading>
          {/* Défilement horizontal plutôt qu'une grille : la rangée garde la
              même hauteur qu'il y ait un favori ou huit, et ne repousse
              jamais les figures hors de l'écran. */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {favoriteEntries.map(({ figure: favFigure, option }) => {
              const active = figure === favFigure && progression === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  // Sélection directe des deux niveaux d'un coup, là où
                  // `selectFigure` referme la figure déjà ouverte : c'est
                  // tout l'intérêt du raccourci.
                  onClick={() => {
                    setFigure(favFigure);
                    setProgression(option.value);
                                }}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl border py-2 pl-2 pr-3.5 transition-colors ${
                    active
                      ? "border-cyan-400/60 bg-slate-900"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  {option.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.image}
                      alt=""
                      className={`h-9 w-12 shrink-0 object-contain ${
                        active ? "" : "opacity-70 saturate-50"
                      }`}
                    />
                  ) : (
                    <span className="flex h-9 w-12 items-center justify-center">
                      <option.Icon
                        className={`h-5 w-5 ${
                          active ? "text-cyan-400" : "text-slate-600"
                        }`}
                      />
                    </span>
                  )}
                  <span className="min-w-0 text-left">
                    <span
                      className={`block truncate text-[13px] font-semibold leading-tight ${
                        active ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {t.variations[option.value].label}
                    </span>
                    <span className="block truncate text-[11px] leading-tight text-slate-500">
                      {t.figures[favFigure].label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <SectionHeading>{t.analysis.figures}</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
        {FIGURES.map((f, index) => {
          const selected = figure === f.value;
          // Nombre impair de figures : la dernière prend toute la largeur
          // plutôt que de laisser un trou dans la grille.
          const wide = FIGURES.length % 2 === 1 && index === FIGURES.length - 1;
          // Une figure est marquée « approximative » quand aucune de ses
          // variations n'a été recalée sur des figures réelles. Dès qu'une
          // seule l'est, la marque disparaît : la famille a une base fiable.
          const figureIsDraft =
            f.available &&
            !VARIATIONS_BY_FIGURE[f.value].some(
              (v) => v.available && isCalibrated(v.value)
            );
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
              {(!f.available || figureIsDraft) && (
                <span className="absolute right-2.5 top-2.5 z-10">
                  <StatusBadge state={f.available ? "draft" : "locked"} />
                </span>
              )}

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
                    {t.figures[f.value].label}
                  </span>
                  <span
                    className={`block truncate text-[11px] leading-tight ${
                      selected ? "text-cyan-300/80" : "text-slate-500"
                    }`}
                  >
                    {f.available ? t.figures[f.value].tagline : t.analysis.comingSoon}
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
      {/* Cible du défilement automatique. La marge de défilement laisse
          respirer le haut : arriver collé au bord donne l'impression d'une
          page tronquée. */}
      <div ref={progressionRef} className="scroll-mt-4" />
      <VariationRail
        options={VARIATIONS_BY_FIGURE[figure]}
        value={progression}
        onChange={setProgression}
      />

      {/* Masqué sur les exercices à répétition : leur type est implicite, et
          proposer « Hold » pour une traction n'aurait aucun sens. */}
      {!isRepProgression(progression) && (
      <div className="space-y-3">
        <SectionHeading>{t.analysis.exerciseTypes}</SectionHeading>
        <div className="grid grid-cols-3 gap-2">
          {EXERCISE_TYPES.map((type) => {
            const selected = exerciseType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                disabled={!type.available}
                onClick={() => setExerciseType(type.value)}
                className={`relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                  !type.available
                    ? "cursor-not-allowed border-slate-800 bg-slate-800/40 text-slate-600"
                    : selected
                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                <type.Icon className={`h-5 w-5 ${selected ? "text-cyan-400" : ""}`} />
                <span className="text-xs font-medium">{type.label}</span>
                {!type.available && (
                  <span className="block text-[10px] text-slate-500">{t.analysis.soon}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {!variationAvailable && !videoUrl && (
        <p className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-400">
          {t.analysis.notAvailableYet}
        </p>
      )}

      {variationAvailable && !videoUrl && !cameraMode && (
        <div ref={actionsRef} className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t.analysis.videoSection}
          </p>
          <p className="text-xs text-slate-500">
            {t.analysis.videoHint}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={requestImport}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-6 text-sm font-medium text-slate-200 hover:border-cyan-700"
            >
              <UploadCloudIcon className="h-7 w-7 text-cyan-400" />
              {t.analysis.import}
            </button>
            <button
              type="button"
              onClick={requestCamera}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-6 text-sm font-medium text-slate-200 hover:border-cyan-700"
            >
              <CameraIcon className="h-7 w-7 text-cyan-400" />
              {t.analysis.record}
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
                aria-label={t.analysis.switchCamera}
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
                {t.analysis.stop}
              </button>
            ) : countdown !== null ? (
              <button
                type="button"
                disabled
                className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-slate-400"
              >
                {t.analysis.countdown(countdown)}
              </button>
            ) : (
              <button
                type="button"
                onClick={beginCountdown}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
              >
                {t.analysis.startRecording}
              </button>
            )}
          </div>
        </div>
      )}

      {videoUrl && duration !== null && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t.analysis.trimSection}
            </p>
            <div className="flex gap-2">
              {fileSource === "camera" && (
                <button
                  type="button"
                  onClick={() => file && downloadBlob(file, file.name)}
                  className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  {t.analysis.saveToPhone}
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
                {t.analysis.whenDone}
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
                {t.analysis.whenDoneHint}
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
                {t.analysis.trimHint}
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
                <span>{t.analysis.trimStart(formatTime(trimStart))}</span>
                <span>Fin : {formatTime(trimEnd)}</span>
                <span>{t.analysis.trimDuration(formatTime(trimEnd - trimStart))}</span>
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
                  {t.analysis.liveAngles(
                    liveAngles.elbowAngle.toFixed(0),
                    liveAngles.hipAngle.toFixed(0)
                  )}
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
              progression={progression}
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
              {t.analysis.saveFailed(saveError)}
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
                ? t.analysis.preparingVideo(compressionProgress)
                : saving
                ? t.analysis.saving
                : t.analysis.saveFigure}
            </button>
          )}

          {saved && (
            <p className="flex items-center justify-center gap-1.5 rounded-lg border border-green-800 bg-green-500/10 py-2.5 text-sm font-medium text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              {t.analysis.savedToHistory}
            </p>
          )}

          {result && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleReanalyze}
                className="w-full rounded-lg border border-slate-700 py-2.5 font-medium text-slate-200 hover:border-slate-600"
              >
                {t.analysis.reanalyse}
              </button>
              <p className="text-center text-xs text-slate-500">
                {saved
                  ? t.analysis.reanalyseSavedHint
                  : t.analysis.reanalyseHint}
              </p>
            </div>
          )}

          {result && result.ok && (
            <ExportVideoButton
              videoRef={previewVideoRef}
              figureLabel={progressionLabel(progression, lang)}
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
                {t.analysis.analysing}
              </button>
              <button
                type="button"
                onClick={handleCancelAnalysis}
                className="w-full rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:border-red-800 hover:text-red-400"
              >
                {t.analysis.cancelAnalysis}
              </button>
            </div>
          )}
        </form>
      )}
      </>
      )}

      {/* Barre d'action ancrée.
          Elle n'apparaît que lorsqu'une figure est choisie ET que les vrais
          boutons d'import sont sortis de l'écran. Doubler une action déjà
          sous les yeux encombrerait pour rien ; la montrer quand on remonte
          parcourir les figures évite d'avoir à redescendre pour agir.
          Ancrée au-dessus de la barre d'onglets, jamais par-dessus. */}
      {figure && variationAvailable && !videoUrl && !cameraMode && !actionsVisible && (
        <div className="fixed inset-x-0 bottom-16 z-20 px-4 pb-3">
          <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/95 shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.95)] backdrop-blur-md">
            {/* Nom de la figure et raccourci vers la progression complète,
                celle qui porte la description de la position. */}
            <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
                {t.figures[figure].label}
              </span>
              <button
                type="button"
                onClick={scrollToProgression}
                aria-label={t.analysis.progression}
                className="-mr-1 shrink-0 rounded-lg p-1 text-slate-600 hover:text-slate-400"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Toutes les variantes, pas seulement la sélectionnée.
                N'afficher que la variante courante donnait l'impression que la
                figure n'en avait qu'une, et il fallait descendre pour
                découvrir les autres. Elles sont numérotées comme dans le rail
                du dessous : c'est une progression, et l'ordre est
                l'information principale. Défilement horizontal, la rangée
                garde donc la même hauteur de trois à six variantes. */}
            <div className="-mx-0 flex gap-1.5 overflow-x-auto px-3 pb-0.5 pt-2">
              {VARIATIONS_BY_FIGURE[figure].map((o, index) => {
                const selected = o.value === progression;
                const draft = o.available && !isCalibrated(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={!o.available}
                    onClick={() => setProgression(o.value)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg border py-1.5 pl-1.5 pr-2.5 transition-colors ${
                      !o.available
                        ? "border-slate-800 bg-slate-900/60 opacity-60"
                        : selected
                        ? "border-cyan-400 bg-cyan-500/15"
                        : "border-slate-700 bg-slate-800/60 hover:border-slate-600"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        !o.available
                          ? "border border-slate-800 text-slate-600"
                          : selected
                          ? "bg-cyan-400 text-slate-950"
                          : "border border-slate-600 text-slate-400"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[12px] ${
                        !o.available
                          ? "font-medium text-slate-500"
                          : selected
                          ? "font-semibold text-white"
                          : "font-medium text-slate-300"
                      }`}
                    >
                      {t.variations[o.value].label}
                    </span>
                    {!o.available && (
                      <LockIcon className="h-3 w-3 shrink-0 text-slate-600" />
                    )}
                    {draft && (
                      <ApproximateIcon className="h-3 w-3 shrink-0 text-amber-400/80" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 p-2.5 pt-2">
              <button
                type="button"
                onClick={requestImport}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-[13px] font-medium text-slate-200 hover:border-cyan-700"
              >
                <UploadCloudIcon className="h-4 w-4 text-cyan-400" />
                {t.analysis.import}
              </button>
              <button
                type="button"
                onClick={requestCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(34,211,238,0.35)]"
              >
                <CameraIcon className="h-4 w-4" />
                {t.analysis.record}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
