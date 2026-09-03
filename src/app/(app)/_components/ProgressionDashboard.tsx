"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CrownIcon,
  TrendUpIcon,
  HelpCircleIcon,
  TimerIcon,
  ChevronDownIcon,
} from "@/components/icons";
import { tierFor, formatHoldDuration } from "@/lib/pose/report";
import ProgressionTour, {
  shouldAutoStartProgressionTour,
} from "./ProgressionTour";

export type ProgressionPoint = {
  sessionId: string;
  date: string;
  score: number;
  holdDuration: number | null;
};
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
const CYAN = "#22d3ee";

type Period = { label: string; days: number | null };
const PERIODS: Period[] = [
  { label: "2 sem", days: 14 },
  { label: "1 mois", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "6 mois", days: 180 },
  { label: "Tout", days: null },
];
const DEFAULT_PERIOD_INDEX = PERIODS.length - 1; // "Tout"

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

function formatDurationCompact(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}min ${s}s`;
}

// Dimensions internes du SVG (unités arbitraires) — le conteneur applique
// le même ratio en CSS (aspect-ratio) pour que les positions en %
// utilisées par le tooltip HTML restent alignées avec le tracé quel que
// soit la largeur réelle à l'écran.
const CHART_W = 320;
const CHART_H = 150;
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
  // null = "pas de sélection explicite", le graphique retombe alors sur le
  // dernier point par défaut — évite un index périmé quand le nombre de
  // points change (changement de variation ou de période).
  const [activeScoreIndex, setActiveScoreIndex] = useState<number | null>(null);
  const [activeHoldIndex, setActiveHoldIndex] = useState<number | null>(null);
  const [periodIndex, setPeriodIndex] = useState(DEFAULT_PERIOD_INDEX);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  // Instantané au montage plutôt qu'un Date.now() appelé pendant le rendu
  // (impur) — un filtre par période n'a pas besoin d'être exact à la
  // milliseconde près pendant qu'un onglet reste ouvert.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const defaultVariation = variations[0];
    if (
      defaultVariation &&
      defaultVariation.points.length >= 2 &&
      shouldAutoStartProgressionTour()
    ) {
      const timeout = setTimeout(() => setTourOpen(true), 500);
      return () => clearTimeout(timeout);
    }
  }, [variations]);

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
          href="/analyser"
          className="inline-block rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
        >
          Faire une analyse
        </Link>
      </div>
    );
  }

  const current = variations.find((v) => v.variation === selected) ?? variations[0];
  const period = PERIODS[periodIndex];
  const points =
    period.days === null
      ? current.points
      : current.points.filter(
          (p) => now - new Date(p.date).getTime() <= period.days! * 86400000
        );
  const n = points.length;
  const holdPoints = points.filter(
    (p): p is ProgressionPoint & { holdDuration: number } => p.holdDuration !== null
  );

  function selectVariation(v: VariationProgression) {
    setSelected(v.variation);
    setActiveScoreIndex(null);
    setActiveHoldIndex(null);
    setSelectorOpen(false);
  }

  function selectPeriod(i: number) {
    setPeriodIndex(i);
    setActiveScoreIndex(null);
    setActiveHoldIndex(null);
  }

  const scoreStats =
    n > 0
      ? {
          latest: points[n - 1].score,
          first: points[0].score,
          best: points.reduce((a, b) => (b.score > a.score ? b : a), points[0]),
        }
      : null;
  const scoreDelta = n > 1 && scoreStats ? scoreStats.latest - scoreStats.first : null;
  const isNewRecord =
    n > 1 && scoreStats !== null && points[n - 1].sessionId === scoreStats.best.sessionId;
  const scoreTrendColor =
    scoreDelta === null
      ? scoreStats
        ? TIER_COLORS[tierFor(scoreStats.latest)]
        : CYAN
      : scoreDelta >= 0
      ? GREEN
      : ORANGE;

  const holdBest =
    holdPoints.length > 0
      ? holdPoints.reduce((a, b) => (b.holdDuration > a.holdDuration ? b : a), holdPoints[0])
      : null;
  const holdTotal = holdPoints.reduce((sum, p) => sum + p.holdDuration, 0);
  const holdDelta =
    holdPoints.length > 1
      ? holdPoints[holdPoints.length - 1].holdDuration - holdPoints[0].holdDuration
      : null;
  const holdTrendColor = holdDelta === null ? CYAN : holdDelta >= 0 ? GREEN : ORANGE;

  return (
    <div className="space-y-4">
      {n >= 2 && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            aria-label="Revoir l'aide de cet onglet"
            className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:border-cyan-700 hover:text-cyan-300"
          >
            <HelpCircleIcon className="h-3.5 w-3.5" />
            Aide
          </button>
        </div>
      )}

      {current.points.length >= 2 && (
        <Link
          href={`/comparaison/${current.variation}`}
          className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-3 transition-colors hover:border-cyan-400/50"
        >
          <div>
            <p className="text-sm font-semibold text-white">Avant / Après</p>
            <p className="text-[11px] text-slate-400">
              Ta référence face à ta dernière analyse
            </p>
          </div>
          <TrendUpIcon className="h-5 w-5 text-cyan-400" />
        </Link>
      )}

      {variations.length > 1 && (
        <div data-tour="progression-variation-selector">
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            Exercice
          </p>
          <button
            type="button"
            onClick={() => setSelectorOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-3"
          >
            <span className="font-semibold text-white">{current.label}</span>
            <div className="flex items-center gap-2 text-slate-400">
              <TimerIcon className="h-4 w-4" />
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${selectorOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {selectorOpen && (
            <div className="mt-1 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
              {variations.map((v) => {
                const active = v.variation === current.variation;
                return (
                  <button
                    key={v.variation}
                    type="button"
                    onClick={() => selectVariation(v)}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                      active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="font-medium">{v.label}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <TimerIcon className="h-3.5 w-3.5" />
                      hold · {v.points.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div data-tour="progression-period-filter">
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
          Période
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => selectPeriod(i)}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === periodIndex
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" data-tour="progression-stats">
        <StatCard label="Séances" value={String(n)} />
        <StatCard
          label="Score actuel"
          value={scoreStats ? `${scoreStats.latest.toFixed(1)}/10` : "—"}
          valueColor={scoreStats ? TIER_COLORS[tierFor(scoreStats.latest)] : undefined}
        />
        <StatCard
          label="Record score"
          value={scoreStats ? `${scoreStats.best.score.toFixed(1)}/10` : "—"}
          valueColor={GREEN}
          icon={<CrownIcon className="h-4 w-4 text-yellow-400" />}
        />
        <StatCard
          label="Évolution score"
          value={
            scoreDelta === null ? "—" : `${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(1)}`
          }
          valueColor={scoreDelta === null ? "#94a3b8" : scoreTrendColor}
        />
      </div>

      {n === 0 ? (
        <EmptyPeriodPanel onReset={() => selectPeriod(DEFAULT_PERIOD_INDEX)} />
      ) : n < 2 ? (
        current.points.length < 2 ? (
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
          <EmptyPeriodPanel onReset={() => selectPeriod(DEFAULT_PERIOD_INDEX)} />
        )
      ) : (
        <>
          <div
            className="rounded-xl border border-slate-800 bg-slate-900 p-3"
            data-tour="progression-chart"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Score</p>
              {isNewRecord && (
                <div className="flex items-center gap-1 text-xs font-medium text-yellow-400">
                  <CrownIcon className="h-3.5 w-3.5" />
                  Nouveau record
                </div>
              )}
            </div>
            <ChartWithTooltip
              points={points.map((p) => ({
                sessionId: p.sessionId,
                date: p.date,
                value: p.score,
              }))}
              activeIndex={activeScoreIndex}
              onSelectIndex={setActiveScoreIndex}
              color={scoreTrendColor}
              bestValue={scoreStats?.best.score ?? 0}
              axisMin={0}
              axisMax={10}
              formatValue={(v) => `${v.toFixed(1)}/10`}
              sessionLinkTourId="progression-session-link"
            />
          </div>

          <div
            className="rounded-xl border border-slate-800 bg-slate-900 p-3"
            data-tour="progression-hold-chart"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Durée de hold</p>
              <div className="flex gap-3 text-[11px] text-slate-500">
                <span>
                  Meilleur{" "}
                  <span className="font-semibold text-white">
                    {holdBest ? formatDurationCompact(holdBest.holdDuration) : "—"}
                  </span>
                </span>
                <span>
                  Total{" "}
                  <span className="font-semibold text-white">
                    {formatDurationCompact(holdTotal)}
                  </span>
                </span>
              </div>
            </div>
            {holdPoints.length < 2 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                Pas encore assez de données de hold sur cette période.
              </p>
            ) : (
              <ChartWithTooltip
                points={holdPoints.map((p) => ({
                  sessionId: p.sessionId,
                  date: p.date,
                  value: p.holdDuration,
                }))}
                activeIndex={activeHoldIndex}
                onSelectIndex={setActiveHoldIndex}
                color={holdTrendColor}
                bestValue={holdBest?.holdDuration ?? 0}
                axisMin={0}
                axisMax={Math.max(5, Math.ceil(((holdBest?.holdDuration ?? 5) * 1.15) / 5) * 5)}
                formatValue={(v) => formatHoldDuration(v)}
              />
            )}
          </div>
        </>
      )}

      {tourOpen && <ProgressionTour onClose={() => setTourOpen(false)} />}
    </div>
  );
}

function EmptyPeriodPanel({ onReset }: { onReset: () => void }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
      <p className="text-sm font-medium text-white">Aucune séance dans cette période</p>
      <p className="text-xs text-slate-500">
        Élargis la période pour retrouver tes séances plus anciennes.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
      >
        Voir tout l&apos;historique
      </button>
    </div>
  );
}

type SeriesPoint = { sessionId: string; date: string; value: number };

function ChartWithTooltip({
  points,
  activeIndex,
  onSelectIndex,
  color,
  bestValue,
  axisMin,
  axisMax,
  formatValue,
  sessionLinkTourId,
}: {
  points: SeriesPoint[];
  activeIndex: number | null;
  onSelectIndex: (i: number) => void;
  color: string;
  bestValue: number;
  axisMin: number;
  axisMax: number;
  formatValue: (v: number) => string;
  sessionLinkTourId?: string;
}) {
  const n = points.length;

  function xFor(i: number) {
    return PAD_X + (i / (n - 1)) * (CHART_W - PAD_X * 2);
  }
  function yFor(value: number) {
    const usableH = CHART_H - PAD_TOP - PAD_BOTTOM;
    return PAD_TOP + usableH * (1 - (value - axisMin) / (axisMax - axisMin));
  }

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value) }));
  const linePath = buildSmoothPath(coords);
  const areaPath =
    `${linePath} L ${coords[n - 1].x} ${CHART_H - PAD_BOTTOM}` +
    ` L ${coords[0].x} ${CHART_H - PAD_BOTTOM} Z`;

  const bestY = yFor(bestValue);
  const gradientId = `progression-fill-${color.replace("#", "")}`;
  // null = pas de sélection explicite -> retombe sur le dernier point,
  // toujours valide quel que soit le nombre de points affichés.
  const effectiveIndex = activeIndex ?? n - 1;
  const active = points[effectiveIndex] ?? null;
  const activeCoord = coords[effectiveIndex] ?? null;
  const midValue = (axisMin + axisMax) / 2;

  return (
    <div className="space-y-1">
      <div className="relative w-full" style={{ aspectRatio: `${CHART_W} / ${CHART_H}` }}>
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

          {/* Repères horizontaux bas / milieu / haut */}
          {[axisMin, midValue, axisMax].map((v) => (
            <g key={v}>
              <line
                x1={PAD_X}
                x2={CHART_W - PAD_X}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text x={0} y={yFor(v) - 3} fill="#475569" fontSize={8}>
                {Math.round(v * 10) / 10}
              </text>
            </g>
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
            const isActive = i === effectiveIndex;
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
            <p className="text-xs font-bold text-white">{formatValue(active.value)}</p>
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
          data-tour={sessionLinkTourId}
          className="block text-center text-xs text-cyan-400 hover:text-cyan-300"
        >
          Voir cette séance
        </Link>
      )}
    </div>
  );
}
