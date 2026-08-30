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
  const [retrying, setRetrying] = useState(false);

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

    async function render(forceLegacyEncoder: boolean) {
      const canvas = document.createElement("canvas");
      return recordAnnotatedVideo({
        video: video!,
        canvas,
        rangeStart: rangeStart ?? 0,
        rangeEnd: rangeEnd ?? video!.duration,
        figureLabel,
        globalScoreValue,
        scores,
        progression,
        landmarksFrames,
        holdStartSeconds,
        holdEndSeconds,
        holdDurationSeconds,
        weakPointCue,
        forceLegacyEncoder,
        onProgress: setProgress,
      });
    }

    try {
      // L'encodage moderne donne un fichier dont la durée déclarée est
      // correcte (indispensable pour l'import Instagram), mais il dépend
      // du matériel du téléphone. S'il échoue pour une raison qu'on ne
      // peut pas anticiper, on refait l'export avec l'ancienne méthode
      // plutôt que de laisser l'utilisateur sans vidéo.
      let result: Awaited<ReturnType<typeof render>>;
      try {
        result = await render(false);
      } catch {
        // Sans ce signal, la seconde passe passe pour un bug : l'utilisateur
        // voit une barre de progression repartir de zéro sans explication.
        setRetrying(true);
        setProgress(0);
        try {
          result = await render(true);
        } finally {
          setRetrying(false);
        }
      }
      const { blob } = result;
      // Prévenir explicitement plutôt que de laisser l'utilisateur
      // découvrir la troncature une fois sur Instagram.
      if (!result.writesCorrectDuration) {
        setNotice(
          "Mode compatible : la durée annoncée du fichier est incomplète, Instagram risque de n'importer que le début. Signale-le-moi si c'est le cas."
        );
      }
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

  // Ouvre la fenêtre de partage du système (WhatsApp, Instagram, TikTok,
  // Gmail...). Appelée SANS aucun await préalable : le navigateur exige que
  // navigator.share() parte directement du clic. Le moindre await avant,
  // même sur une valeur déjà en cache, consomme le "geste utilisateur" et
  // fait échouer l'appel avec Permission denied.
  // Ouvre la fenêtre de partage du système (WhatsApp, Instagram, TikTok,
  // Gmail...) à partir d'une vidéo déjà en cache, SANS aucun await
  // préalable : le navigateur exige que navigator.share() parte
  // directement du clic. Le moindre await avant, même sur une valeur déjà
  // disponible, consomme le "geste utilisateur" et fait échouer l'appel.
  function shareFromCache(blob: Blob, filename: string) {
    const file = new File([blob], filename, { type: blob.type });

    if (!navigator.canShare?.({ files: [file] })) {
      downloadBlob(blob, filename);
      setNotice(
        "Ce navigateur ne sait pas partager de fichier. La vidéo a été téléchargée, tu peux la publier depuis ta galerie."
      );
      return;
    }

    // Uniquement `files`, sans title ni text : plusieurs applications
    // Android refusent un partage qui mélange fichier et texte, et
    // renvoient justement une erreur de permission. Le fichier seul est
    // le format le plus largement accepté.
    navigator
      .share({ files: [file] })
      .catch((err: Error) => {
        // Fermer la fenêtre de partage n'est pas une erreur à signaler.
        if (err.name === "AbortError") return;
        downloadBlob(blob, filename);
        setNotice(
          "Ton téléphone a refusé le partage direct. La vidéo a été téléchargée, tu peux la publier depuis ta galerie."
        );
      });
  }

  function handleShare() {
    // Vidéo déjà prête : la fenêtre de partage s'ouvre immédiatement.
    if (validCache) {
      shareFromCache(validCache.blob, validCache.filename);
      return;
    }

    // Sinon on génère d'abord, puis on tente quand même le partage : sur
    // beaucoup de navigateurs il passe si la génération a été rapide. En
    // cas de refus (geste utilisateur expiré), la vidéo reste en cache et
    // un second appui part instantanément.
    generate()
      .then(({ blob, filename }) => {
        shareFromCache(blob, filename);
      })
      .catch((err: Error) => {
        setError("Export impossible : " + err.message);
      });
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
            onClick={handleShare}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(34,211,238,0.6)] transition-opacity disabled:opacity-60"
          >
            {busy
              ? `${retrying ? "Nouvelle tentative" : "Génération"}... ${progress}%`
              : "Partager sur mes réseaux"}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 py-2.5 text-sm font-medium text-cyan-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:opacity-60"
          >
            <DownloadIcon className="h-4 w-4" />
            Télécharger la vidéo
          </button>
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
