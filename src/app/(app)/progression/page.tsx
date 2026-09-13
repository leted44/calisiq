import Link from "next/link";
import { getLang, getDictionary } from "@/lib/i18n/server";
import { figureLadders } from "@/lib/pose/ladder";
import {
  TIER_CANVAS_COLORS,
  tierForPoints,
  tierProgress,
  nextTier,
  type Tier,
} from "@/lib/pose/level";
import { progressionLabel } from "@/lib/pose/report";
import FigureMedal from "../_components/FigureMedal";
import { loadProgression } from "./_data";

/**
 * La collection de figures.
 *
 * POURQUOI UNE COLLECTION, ET NON UN TABLEAU DE BORD
 *
 * La page montrait d'un coup le niveau, le parcours, un sélecteur, un filtre
 * de période, quatre compteurs et deux courbes. Chaque élément était juste et
 * l'ensemble illisible : rien n'y était plus important que le reste, donc
 * rien ne s'y voyait.
 *
 * Elle ne répond plus qu'à une question : où j'en suis, figure par figure.
 * Une tuile par figure, allumée ou verrouillée, et c'est tout. Le détail
 * d'une figure, ses paliers et ses courbes, vit sur sa propre page, à un
 * geste d'ici. Et ce qui est rare tient sa valeur de ce qu'on voit sans
 * l'avoir : les figures jamais tentées restent donc affichées, éteintes.
 */
export default async function ProgressionPage() {
  const t = await getDictionary();
  const lang = await getLang();
  const { bestPoints } = await loadProgression(lang);

  const figures = figureLadders().map((ladder) => {
    const meilleur = ladder.variations.reduce(
      (max, v) => Math.max(max, bestPoints[v] ?? 0),
      0
    );
    const meilleureVariation = ladder.variations.reduce(
      (best, v) => ((bestPoints[v] ?? 0) > (bestPoints[best] ?? 0) ? v : best),
      ladder.variations[0]
    );
    return {
      ...ladder,
      label: t.figures[ladder.family].label,
      debloquees: ladder.variations.filter((v) => (bestPoints[v] ?? 0) > 0).length,
      meilleur,
      meilleureVariation,
      tier: tierForPoints(meilleur),
    };
  });

  // Les figures commencées en tête, de la plus aboutie à la moins : le regard
  // tombe d'abord sur ce dont on est fier. Le reste garde l'ordre du
  // catalogue, qui n'est pas un classement.
  const commencees = figures
    .filter((f) => f.debloquees > 0)
    .sort((a, b) => b.meilleur - a.meilleur);
  const aVenir = figures.filter((f) => f.debloquees === 0);

  const total = Object.values(bestPoints).reduce((somme, p) => somme + p, 0);
  const niveaux = Object.keys(bestPoints).length;
  const reine = commencees[0] ?? null;

  return (
    <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">{t.progressPage.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          {t.level.hallSubtitle}
        </p>
      </div>

      {reine ? (
        <div className="w-full max-w-md">
          <Hero
            tier={reine.tier}
            points={reine.meilleur}
            figureLabel={progressionLabel(reine.meilleureVariation, lang)}
            total={total}
            figures={commencees.length}
            niveaux={niveaux}
            t={t}
          />
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="font-medium text-white">{t.empty.noProgressYet}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {t.empty.noProgressBody}
          </p>
          <Link
            href="/analyser"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
          >
            {t.landing.ctaFirst}
          </Link>
        </div>
      )}

      <div className="w-full max-w-md">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t.level.yourFigures}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {[...commencees, ...aVenir].map((f) => (
            <Link
              key={f.family}
              href={`/progression/${f.family}`}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3.5 transition-colors ${
                f.debloquees > 0
                  ? "border-slate-800 bg-slate-900 hover:border-slate-700"
                  : "border-slate-800/60 bg-slate-900/30 hover:border-slate-800"
              }`}
            >
              <FigureMedal tier={f.tier} size={58} locked={f.debloquees === 0}>
                <span
                  className="font-mono text-[15px] font-bold tabular-nums"
                  style={{ color: TIER_CANVAS_COLORS[f.tier] }}
                >
                  {Math.round(f.meilleur)}
                </span>
              </FigureMedal>

              <div className="text-center">
                <p
                  className={`text-[13px] font-semibold leading-tight ${
                    f.debloquees > 0 ? "text-white" : "text-slate-500"
                  }`}
                >
                  {f.label}
                </p>
                <p
                  className="mt-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{
                    color: f.debloquees > 0 ? TIER_CANVAS_COLORS[f.tier] : "#475569",
                  }}
                >
                  {f.debloquees > 0
                    ? t.result.tiers[f.tier]
                    : t.level.notStartedFigure}
                </p>
              </div>

              {/* Un segment par variante, allumé à la couleur de son palier.
                  C'est la même information que l'échelle de la page suivante,
                  réduite à ce qui se lit d'un coup d'oeil : combien de
                  barreaux sont franchis, et à quel point. */}
              <div className="flex w-full gap-[3px]">
                {f.variations.map((v) => {
                  const p = bestPoints[v] ?? 0;
                  return (
                    <span
                      key={v}
                      className="h-1 flex-1 rounded-full"
                      style={{
                        backgroundColor:
                          p > 0 ? TIER_CANVAS_COLORS[tierForPoints(p)] : "#1e293b",
                      }}
                    />
                  );
                })}
              </div>

              <p className="font-mono text-[10px] tabular-nums text-slate-500">
                {f.debloquees}/{f.variations.length}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Bandeau de niveau ---
//
// Deux chiffres qui ne mesurent pas la même chose, et qu'il serait faux de
// confondre. Le PALIER est celui de la meilleure figure : tenir une full
// planche rend élite, même si c'est la seule chose qu'on ait filmée. Le TOTAL
// est la somme des meilleurs résultats ; il ne dit pas le niveau mais
// l'étendue. D'où la hiérarchie : le palier occupe le médaillon et le titre,
// le total passe en pied de carte avec les autres compteurs.
function Hero({
  tier,
  points,
  figureLabel,
  total,
  figures,
  niveaux,
  t,
}: {
  tier: Tier;
  points: number;
  figureLabel: string;
  total: number;
  figures: number;
  niveaux: number;
  t: Awaited<ReturnType<typeof getDictionary>>;
}) {
  const couleur = TIER_CANVAS_COLORS[tier];
  const avancement = tierProgress(points);
  const suivant = nextTier(points);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: couleur, opacity: 0.13 }}
      />

      <div className="relative flex items-center gap-4">
        <FigureMedal tier={tier} size={76}>
          <span
            className="font-mono text-[20px] font-bold tabular-nums"
            style={{ color: couleur }}
          >
            {Math.round(points)}
          </span>
        </FigureMedal>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t.level.yourLevel}
          </p>
          <p
            className="text-[21px] font-bold leading-tight"
            style={{ color: couleur }}
          >
            {t.result.tiers[tier]}
          </p>
          <p className="truncate text-[12px] text-slate-400">{figureLabel}</p>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(avancement * 100)}%`,
                backgroundColor: couleur,
              }}
            />
          </div>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {suivant
              ? t.result.toNextTier(
                  Math.ceil(suivant.remaining),
                  t.result.tiers[suivant.tier]
                )
              : t.result.topTier}
          </p>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-center">
        <Compteur label={t.level.total} value={Math.round(total)} />
        <Compteur label={t.level.figuresTracked} value={figures} />
        <Compteur label={t.level.theLevels} value={niveaux} />
      </div>
    </div>
  );
}

function Compteur({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-[17px] font-bold tabular-nums text-white">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
