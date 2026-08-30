"use client";

import { useState, type RefObject } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { recordAnnotatedVideo, downloadBlob } from "@/lib/pose/exportVideo";
import type { CriterionScore } from "@/lib/pose/scoring";
import type { Progression } from "@/lib/pose/grid";
import {
  DownloadIcon,
  CrownIcon,
  CheckCircleIcon,
  BodyIcon,
  TimerIcon,
  TrendUpIcon,
} from "@/components/icons";

const FEATURES = [
  { icon: BodyIcon, label: "Squelette superposé" },
  { icon: TrendUpIcon, label: "Scores en direct" },
  { icon: TimerIcon, label: "Chrono du hold" },
  { icon: CheckCircleIcon, label: "Écran de score final" },
];

// Aucune app mobile Instagram/TikTok n'accepte de recevoir une vidéo par
// URL scheme : le partage direct passe forcément par le share sheet du
// système. On l'ouvre au clic sur "Autre app" ; les boutons Instagram/
// TikTok téléchargent la vidéo dans les fichiers du téléphone et ouvrent
// l'application, à charge pour l'utilisateur de sélectionner la vidéo
// depuis sa galerie (le seul chemin qui marche vraiment sur toutes les
// versions d'OS et modes d'installation Instagram/TikTok).
const SHARE_TARGETS = [
  {
    id: "instagram" as const,
    label: "Instagram",
    hint: "Story ou Reel",
    // instagram:// suffit sur iOS ; sur Android, l'app intercepte aussi
    // https://www.instagram.com si elle est installée, sinon le lien
    // ouvre le site dans le navigateur.
    url: "instagram://app",
    fallbackUrl: "https://www.instagram.com/",
    accent: "from-fuchsia-500/25 to-orange-500/25 ring-fuchsia-500/40",
    dot: "bg-gradient-to-br from-fuchsia-500 to-orange-500",
  },
  {
    id: "tiktok" as const,
    label: "TikTok",
    hint: "Nouvelle publication",
    url: "snssdk1233://",
    fallbackUrl: "https://www.tiktok.com/",
    accent: "from-white/20 to-cyan-500/20 ring-white/30",
    dot: "bg-gradient-to-br from-cyan-400 via-white to-pink-500",
  },
];

type ShareTarget = (typeof SHARE_TARGETS)[number];

// Tente d'ouvrir un URL scheme d'application, avec repli sur le site web
// après un court délai (les schemes non gérés ne renvoient aucune erreur,
// il faut vérifier après coup si la fenêtre a bien changé de contexte).
function openApp(appUrl: string, fallbackUrl: string) {
  const timeout = window.setTimeout(() => {
    window.location.href = fallbackUrl;
  }, 1500);
  // Si l'app s'ouvre, la page perd le focus (visibilitychange). On annule
  // alors le repli pour ne pas ré-ouvrir le site dans le navigateur au
  // retour de l'app.
  const cancel = () => {
    window.clearTimeout(timeout);
    document.removeEventListener("visibilitychange", cancel);
  };
  document.addEventListener("visibilitychange", cancel);
  window.location.href = appUrl;
}

export default function ExportVideoButton({
  videoRef,
  figureLabel,
  globalScoreValue,
  scores,
  progression,
  rangeStart,
  rangeEnd,
  landmarksFrames,
  holdStartSeconds,
  holdEndSeconds,
  holdDurationSeconds,
  weakPointCue,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  figureLabel: string;
  globalScoreValue: number;
  scores: CriterionScore[];
  progression: Progression;
  rangeStart?: number;
  rangeEnd?: number;
  landmarksFrames?: NormalizedLandmark[][];
  holdStartSeconds?: number | null;
  holdEndSeconds?: number | null;
  holdDurationSeconds?: number | null;
  weakPointCue?: string | null;
}) {
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  // La vidéo générée est mise en cache pour que le partage juste après un
  // téléchargement soit instantané — indispensable pour le partage natif
  // qui exige un geste utilisateur encore "frais" (une longue génération
  // entre le clic et l'appel de navigator.share le ferait refuser).
  const cacheKey = [
    figureLabel,
    progression,
    globalScoreValue,
    holdDurationSeconds,
    rangeStart,
    rangeEnd,
    scores.length,
  ].join("|");
  const [cached, setCached] = useState<{
    key: string;
    blob: Blob;
    filename: string;
  } | null>(null);
  const validCache = cached?.key === cacheKey ? cached : null;

  async function generate(): Promise<{ blob: Blob; filename: string }> {
    if (validCache) return validCache;

    const video = videoRef.current;
    if (!video) throw new Error("Vidéo introuvable.");

    setRecording(true);
    setProgress(0);
    setError(null);
    setNotice(null);

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
        progression,
        landmarksFrames,
        holdStartSeconds,
        holdEndSeconds,
        holdDurationSeconds,
        weakPointCue,
        onProgress: setProgress,
      });
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      const filename = `calisiq-${figureLabel
        .toLowerCase()
        .replace(/\s+/g, "-")}-${Date.now()}.${extension}`;
      setCached({ key: cacheKey, blob, filename });
      return { blob, filename };
    } finally {
      setRecording(false);
      video.pause();
    }
  }

  async function handleDownload() {
    try {
      const { blob, filename } = await generate();
      downloadBlob(blob, filename);
    } catch (err) {
      setError("Export impossible : " + (err as Error).message);
    }
  }

  // navigator.share() sans aucun await préalable : le navigateur exige que
  // l'appel parte directement du clic (transient activation). Le moindre
  // await avant, même sur une valeur déjà en cache, fait perdre le "geste
  // utilisateur" et déclenche NotAllowedError/Permission denied.
  function nativeShareNow(blob: Blob, filename: string): boolean {
    const file = new File([blob], filename, { type: blob.type });
    if (!navigator.canShare?.({ files: [file] })) return false;

    navigator
      .share({
        files: [file],
        title: `${figureLabel} · ${globalScoreValue.toFixed(1)}/10`,
        text: `${figureLabel} analysée avec CalisIQ : ${globalScoreValue.toFixed(1)}/10`,
      })
      .catch((err: Error) => {
        // L'utilisateur qui ferme la fenêtre n'est pas une erreur.
        if (err.name === "AbortError") return;
        // Message clair côté user, plutôt que la sortie brute du navigateur
        // ("Permission denied" / "NotAllowedError") qui n'apprend rien.
        setError(
          "Le partage direct a été refusé par ton téléphone. Utilise plutôt Instagram, TikTok, ou télécharge la vidéo."
        );
      });
    return true;
  }

  function handleNativeShare() {
    if (!validCache) {
      generate()
        .then(() => {
          setNotice("Vidéo prête. Retouche 'Autre application' pour partager.");
        })
        .catch((err: Error) => setError("Export impossible : " + err.message));
      return;
    }
    if (nativeShareNow(validCache.blob, validCache.filename)) return;
    downloadBlob(validCache.blob, validCache.filename);
    setNotice(
      "Le partage direct n'est pas disponible sur ce navigateur, la vidéo a été téléchargée."
    );
  }

  // Instagram/TikTok : la seule voie fiable est de télécharger la vidéo
  // dans les fichiers du téléphone puis d'ouvrir l'application, l'user
  // sélectionnant ensuite la vidéo depuis sa galerie. Aucune app ne prend
  // une vidéo par URL scheme, et le share sheet natif dépend d'apps
  // enregistrées côté OS qui peuvent bloquer (cas "Permission denied").
  async function handleAppShare(target: ShareTarget) {
    setShareMenuOpen(false);
    try {
      const { blob, filename } = await generate();
      downloadBlob(blob, filename);
      setNotice(
        `Vidéo enregistrée. ${target.label} s'ouvre — sélectionne la vidéo depuis ta galerie pour la publier.`
      );
      // Court délai pour que le téléchargement ait le temps de partir
      // avant que la page ne perde le focus vers l'app.
      window.setTimeout(() => {
        openApp(target.url, target.fallbackUrl);
      }, 400);
    } catch (err) {
      setError("Export impossible : " + (err as Error).message);
    }
  }

  const busy = recording;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-cyan-400/70 via-blue-500/40 to-indigo-500/70 p-px shadow-[0_0_45px_-10px_rgba(34,211,238,0.55)]">
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-blue-500/25 ring-1 ring-cyan-400/40">
              <DownloadIcon className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Ta vidéo analysée</p>
              <p className="text-[11px] text-slate-400">Prête à publier</p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/40">
            <CrownIcon className="h-3 w-3" />
            Pro
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <span className="text-[11px] leading-tight text-slate-300">{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(34,211,238,0.6)] transition-opacity disabled:opacity-60"
          >
            <DownloadIcon className="h-4 w-4" />
            {busy ? `Génération... ${progress}%` : "Télécharger la vidéo"}
          </button>

          <button
            type="button"
            onClick={() => setShareMenuOpen((o) => !o)}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 py-2.5 text-sm font-medium text-cyan-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            {shareMenuOpen ? "Fermer le menu de partage" : "Partager sur mes réseaux"}
          </button>

          {shareMenuOpen && (
            <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
              {SHARE_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => handleAppShare(target)}
                  disabled={busy}
                  className={`flex w-full items-center gap-3 rounded-lg bg-gradient-to-r ${target.accent} p-3 text-left ring-1 disabled:opacity-60`}
                >
                  <span className={`flex h-9 w-9 shrink-0 rounded-lg ${target.dot}`} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-white">
                      {target.label}
                    </span>
                    <span className="block text-[11px] text-slate-300">
                      {target.hint}
                    </span>
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleNativeShare}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <DownloadIcon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white">
                    Autre application
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    Message, mail, cloud, réseau non listé...
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>

        {busy && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {notice && <p className="mt-2 text-xs text-slate-400">{notice}</p>}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
