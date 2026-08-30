"use client";

import { useRef, useState } from "react";
import { formatHoldDuration } from "@/lib/pose/report";
import { TrendUpIcon, TimerIcon } from "@/components/icons";

export type ComparisonSide = {
  videoUrl: string | null;
  date: string;
  score: number | null;
  holdDuration: number | null;
  trimStart: number | null;
  trimEnd: number | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 5) return "text-yellow-400";
  return "text-orange-400";
}

function DeltaBadge({
  value,
  suffix,
  label,
  icon: Icon,
}: {
  value: number;
  suffix: string;
  label: string;
  icon: typeof TrendUpIcon;
}) {
  const positive = value >= 0;
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
        positive
          ? "border-green-500/30 bg-green-500/10"
          : "border-orange-500/30 bg-orange-500/10"
      }`}
    >
      <Icon className={`h-4 w-4 ${positive ? "text-green-400" : "text-orange-400"}`} />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p
          className={`text-sm font-bold ${
            positive ? "text-green-400" : "text-orange-400"
          }`}
        >
          {positive ? "+" : ""}
          {value.toFixed(1)}
          {suffix}
        </p>
      </div>
    </div>
  );
}

function SideVideo({
  side,
  tag,
  tagColor,
  videoRef,
}: {
  side: ComparisonSide;
  tag: string;
  tagColor: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div className="flex-1">
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        {side.videoUrl ? (
          <video
            ref={videoRef}
            src={side.videoUrl}
            playsInline
            muted
            preload="metadata"
            className="aspect-[9/16] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[9/16] w-full items-center justify-center px-2 text-center text-xs text-slate-500">
            Vidéo introuvable
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagColor}`}
        >
          {tag}
        </span>
      </div>

      <div className="mt-2 space-y-0.5 text-center">
        <p className="text-[11px] text-slate-500">{formatDate(side.date)}</p>
        {side.score !== null && (
          <p className={`text-lg font-bold ${scoreColor(side.score)}`}>
            {side.score.toFixed(1)}
            <span className="text-xs font-normal text-slate-600">/10</span>
          </p>
        )}
        {side.holdDuration !== null && (
          <p className="text-[11px] text-slate-400">
            {formatHoldDuration(side.holdDuration)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ComparisonView({
  before,
  after,
}: {
  before: ComparisonSide;
  after: ComparisonSide;
}) {
  const beforeRef = useRef<HTMLVideoElement>(null);
  const afterRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Lecture synchronisée : les deux vidéos redémarrent ensemble à leur
  // propre début de découpe, pour que les figures soient comparées au même
  // instant relatif plutôt qu'à la même seconde absolue (les deux clips
  // n'ont ni la même durée ni le même moment d'entrée dans la figure).
  function handleTogglePlay() {
    const videos = [beforeRef.current, afterRef.current].filter(
      (v): v is HTMLVideoElement => v !== null
    );
    if (videos.length === 0) return;

    if (playing) {
      videos.forEach((v) => v.pause());
      setPlaying(false);
      return;
    }

    videos.forEach((v, i) => {
      const side = i === 0 ? before : after;
      v.currentTime = side.trimStart ?? 0;
      void v.play().catch(() => {
        // Lecture refusée (onglet en arrière-plan, politique navigateur) :
        // on ne bloque pas l'autre vidéo pour autant.
      });
    });
    setPlaying(true);
  }

  const scoreDelta =
    before.score !== null && after.score !== null ? after.score - before.score : null;
  const holdDelta =
    before.holdDuration !== null && after.holdDuration !== null
      ? after.holdDuration - before.holdDuration
      : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <SideVideo
          side={before}
          tag="Avant"
          tagColor="bg-slate-800/90 text-slate-300"
          videoRef={beforeRef}
        />
        <SideVideo
          side={after}
          tag="Après"
          tagColor="bg-cyan-500/90 text-white"
          videoRef={afterRef}
        />
      </div>

      <button
        type="button"
        onClick={handleTogglePlay}
        className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 hover:border-cyan-700"
      >
        {playing ? "Mettre en pause" : "Lancer les deux vidéos"}
      </button>

      {(scoreDelta !== null || holdDelta !== null) && (
        <div className="grid grid-cols-2 gap-3">
          {scoreDelta !== null && (
            <DeltaBadge
              value={scoreDelta}
              suffix=" pts"
              label="Score"
              icon={TrendUpIcon}
            />
          )}
          {holdDelta !== null && (
            <DeltaBadge
              value={holdDelta}
              suffix="s"
              label="Hold"
              icon={TimerIcon}
            />
          )}
        </div>
      )}
    </div>
  );
}
