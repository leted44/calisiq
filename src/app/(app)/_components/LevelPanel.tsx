"use client";

import { useT } from "@/lib/i18n/client";
import { TIER_STYLES, type Tier } from "@/lib/pose/level";

export type FigureLevel = {
  variation: string;
  label: string;
  points: number;
  tier: Tier;
};

// Niveau du pratiquant, en tête de la page de progression.
//
// DEUX CHIFFRES, PAS UN
//
// Le palier et le total ne mesurent pas la même chose, et les confondre
// donnerait un résultat faux dans les deux sens.
//
// Le PALIER est celui de la meilleure figure. Quelqu'un qui tient une full
// planche est de niveau élite, même s'il n'a filmé qu'elle : son niveau ne
// dépend pas du nombre de figures qu'il a pensé à enregistrer.
//
// Le TOTAL est la somme des meilleurs résultats. Il ne dit pas le niveau mais
// l'étendue : deux personnes de même palier n'ont pas le même total si l'une
// travaille cinq figures et l'autre une seule.
//
// Appliquer les paliers d'une figure au total aurait été le piège évident :
// leurs seuils sont calibrés sur cent points maximum, alors qu'un total les
// dépasse dès la troisième figure sérieuse, et tout le monde serait devenu
// légendaire par accumulation.
export default function LevelPanel({
  figures,
  total,
}: {
  figures: FigureLevel[];
  total: number;
}) {
  const t = useT();

  if (figures.length === 0) return null;

  // Les figures arrivent déjà triées par points décroissants : la première
  // est celle qui porte le niveau.
  const meilleure = figures[0];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/40 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t.level.yourLevel}
        </p>

        <div className="mt-2 flex items-center gap-3">
          <span
            className={`rounded-xl border px-3 py-1.5 text-[15px] font-bold ${TIER_STYLES[meilleure.tier]}`}
          >
            {t.result.tiers[meilleure.tier]}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-slate-300">
              {meilleure.label}
            </span>
            <span className="block font-mono text-[11px] tabular-nums text-slate-500">
              {t.result.points(Math.round(meilleure.points))}
            </span>
          </span>
        </div>

        {/* Total et étendue, en retrait : ils complètent le palier sans lui
            disputer la place. */}
        <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {t.level.total}
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-white">
              {Math.round(total)}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {t.level.figuresTracked}
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-white">
              {figures.length}
            </p>
          </div>
        </div>
      </div>

      {/* Détail par figure. Trié par points, donc l'ordre dit déjà où se
          situe chacune : le regard n'a pas à comparer des chiffres. */}
      {figures.length > 1 && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <p className="border-b border-slate-800 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t.level.byFigure}
          </p>
          <div className="divide-y divide-slate-800/70">
            {figures.map((f) => (
              <div
                key={f.variation}
                className="flex items-center gap-3 px-3.5 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-300">
                  {f.label}
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_STYLES[f.tier]}`}
                >
                  {t.result.tiers[f.tier]}
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-500">
                  {Math.round(f.points)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
