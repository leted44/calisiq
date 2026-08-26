"use client";

import { useState } from "react";
import Link from "next/link";
import { CrownIcon, TrendUpIcon } from "@/components/icons";
import { tierFor } from "@/lib/pose/report";

export type ProgressionPoint = { sessionId: string; date: string; score: number };
export type VariationProgression = {
  variation: string;
  label: string;
  points: ProgressionPoint[];
};

const TIER_COLORS: Record<string, string> = {
  optimal: "#4ade80",
  bon: "#22d3ee",
  faible: "#fb923c",
};

const GREEN = "#4ade80";
const ORANGE = "#fb923c";

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Dimensions internes du SVG (unités arbitraires) — le conteneur applique
// le même ratio en CSS (aspect-ratio) pour que les positions en %
// utilisées par le tooltip HTML restent alignées avec le tracé quel que
// soit la largeur réelle à l'écran.
const CHART_W = 320;
const CHART_H = 170;
const PAD_X = 10;
const PAD_TOP = 20;
const PAD_BOTTOM = 22;

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${xc} ${yc}`;
  }
  const last = pts[pts.length - 1];
  const secondLast = pts[pts.length - 2];
  d += ` Q ${secondLast.x} ${secondLast.y} ${last.x} ${last.y}`;
  return d;
}

function StatCard({
  label,
  value,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        {icon}
        <span className="text-xl font-bold" style={{ color: valueColor ?? "#fff" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function ProgressionDashboard({
  variations,
}: {
  variations: VariationProgression[];
}) {
  const [selected, setSelected] = useState<string | null>(
    variations[0]?.variation ?? null
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(
    variations[0] ? variations[0].points.length - 1 : null
  );

  if (variations.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
        <TrendUpIcon className="mx-auto h-8 w-8 text-slate-600" />
        <p className="text-sm font-medium text-white">
          Pas encore de progression à afficher
        </p>
        <p className="text-xs text-slate-500">
          Termine ta première analyse pour commencer à suivre ton évolution,
          figure par figure.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
        >
          Faire une analyse
        </Link>
      </div>
    );
  }

  const current = variations.find((v) => v.variation === selected) ?? variations[0];
  const points = current.points;
  const n = points.length;

  function selectVariation(v: VariationProgression) {
    setSelected(v.variation);
    setActiveIndex(v.points.length - 1);
  }

  const latest = points[n - 1];
  const first = points[0];
  const best = points.reduce((a, b) => (b.score > a.score ? b : a), points[0]);
  const delta = n > 1 ? latest.score - first.score : null;
  const isNewRecord = n > 1 && latest.sessionId === best.sessionId;
  const trendColor = delta === null ? TIER_COLORS[tierFor(latest.score)] : delta >= 0 ? GREEN : ORANGE;

  return (
    <div className="space-y-4">
      {variations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {variations.map((v) => {
            const active = v.variation === current.variation;
            return (
              <button
                key={v.variation}
                type="button"
                onClick={() => selectVariation(v)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                }`}
              >
                {v.label}
                <span className="ml-1.5 opacity-60">{v.points.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Séances" value={String(n)} />
        <StatCard
          label="Score actuel"
          value={`${latest.score.toFixed(1)}/10`}
          valueColor={TIER_COLORS[tierFor(latest.score)]}
        />
        <StatCard
          label="Record"
          value={`${best.score.toFixed(1)}/10`}
          valueColor={GREEN}
          icon={<CrownIcon className="h-4 w-4 text-yellow-400" />}
        />
        <StatCard
          label="Évolution"
          value={delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`}
          valueColor={delta === null ? "#94a3b8" : trendColor}
        />
      </div>

      {n < 2 ? (
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-sm font-medium text-white">
            Une seule séance pour l&apos;instant
          </p>
          <p className="text-xs text-slate-500">
            Refais une analyse de {current.label} pour voir apparaître ta
            courbe de progression.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          {isNewRecord && (
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-yellow-400">
              <CrownIcon className="h-3.5 w-3.5" />
              Nouveau record sur cette figure
            </div>
          )}
          <ChartWithTooltip
            points={points}
            activeIndex={activeIndex}
            onSelectIndex={setActiveIndex}
            color={trendColor}
            bestScore={best.score}
          />
        </div>
      )}
    </div>
  );
}

function ChartWithTooltip({
  points,
  activeIndex,
  onSelectIndex,
  color,
  bestScore,
}: {
  points: ProgressionPoint[];
  activeIndex: number | null;
  onSelectIndex: (i: number) => void;
  color: string;
  bestScore: number;
}) {
  const n = points.length;
  const minScore = 0;
  const maxScore = 10;

  function xFor(i: number) {
    return PAD_X + (i / (n - 1)) * (CHART_W - PAD_X * 2);
  }
  function yFor(score: number) {
    const usableH = CHART_H - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + usableH * (1 - (score - minScore) / (maxScore - minScore));
  }

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.score) }));
  const linePath = buildSmoothPath(coords);
  const areaPath =
    `${linePath} L ${coords[n - 1].x} ${CHART_H - PAD_BOTTOM}` +
    ` L ${coords[0].x} ${CHART_H - PAD_BOTTOM} Z`;

  const bestY = yFor(bestScore);
  const gradientId = "progression-fill";
  const active = activeIndex !== null ? points[activeIndex] : null;
  const activeCoord = activeIndex !== null ? coords[activeIndex] : null;

  return (
    <div className="space-y-1">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${CHART_W} / ${CHART_H}` }}
      >
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Repères horizontaux 0 / 5 / 10 */}
          {[0, 5, 10].map((s) => (
            <line
              key={s}
              x1={PAD_X}
              x2={CHART_W - PAD_X}
              y1={yFor(s)}
              y2={yFor(s)}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}

          {/* Ligne pointillée au record */}
          <line
            x1={PAD_X}
            x2={CHART_W - PAD_X}
            y1={bestY}
            y2={bestY}
            stroke="#facc15"
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />

          {coords.map((c, i) => {
            const isActive = i === activeIndex;
            return (
              <g key={points[i].sessionId}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={9}
                  fill="transparent"
                  onClick={() => onSelectIndex(i)}
                  className="cursor-pointer"
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isActive ? 4.5 : 3}
                  fill={isActive ? color : "#0f172a"}
                  stroke={color}
                  strokeWidth={2}
                  className="pointer-events-none transition-all"
                />
              </g>
            );
          })}
        </svg>

        {active && activeCoord && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950/95 px-2.5 py-1.5 text-center shadow-lg"
            style={{
              left: `${(activeCoord.x / CHART_W) * 100}%`,
              top: `${(activeCoord.y / CHART_H) * 100 - 4}%`,
            }}
          >
            <p className="text-xs font-bold text-white">{active.score.toFixed(1)}/10</p>
            <p className="text-[10px] text-slate-400">{formatFullDate(active.date)}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{formatShortDate(points[0].date)}</span>
        <span>{formatShortDate(points[n - 1].date)}</span>
      </div>

      {active && (
        <Link
          href={`/historique/${active.sessionId}`}
          className="block text-center text-xs text-cyan-400 hover:text-cyan-300"
        >
          Voir cette séance
        </Link>
      )}
    </div>
  );
}
