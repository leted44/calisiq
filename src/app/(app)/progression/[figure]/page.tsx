import Link from "next/link";
import { notFound } from "next/navigation";
import { getLang, getDictionary } from "@/lib/i18n/server";
import { figureLadder, ladderFamily } from "@/lib/pose/ladder";
import {
  TIER_CANVAS_COLORS,
  TIER_STYLES,
  HOLD_TARGET_SECONDS,
  tierForPoints,
  tierProgress,
  nextTier,
} from "@/lib/pose/level";
import { progressionLabel } from "@/lib/pose/report";
import FigureMedal from "../../_components/FigureMedal";
import ProgressionDashboard from "../../_components/ProgressionDashboard";
import { loadProgression } from "../_data";

/**
 * Le détail d'une figure : son échelle, puis ses courbes.
 *
 * POURQUOI UNE PAGE À PART
 *
 * Parce que c'est ici, et seulement ici, qu'on a le droit d'être dense. La
 * collection répond à « où j'en suis » d'un coup d'oeil ; celle-ci répond à
 * « et sur cette figure, alors ? », question qu'on ne pose qu'une figure à la
 * fois. Les courbes, le filtre de période et les compteurs n'encombrent donc
 * plus personne : ils n'apparaissent qu'à qui est venu les chercher.
 *
 * L'ÉCHELLE D'ABORD, LES COURBES ENSUITE
 *
 * L'échelle dit où l'on est dans la figure, la courbe dit comment on y
 * progresse. La première se lit sans rien savoir, la seconde suppose qu'on
 * sache déjà où l'on est : leur ordre n'est pas négociable.
 */
export default async function FigureLadderPage({
  params,
}: {
  params: Promise<{ figure: string }>;
}) {
  const t = await getDictionary();
  const lang = await getLang();
  const { figure } = await params;

  const ladder = figureLadder(figure);
  if (!ladder) notFound();

  const { variations, bestPoints } = await loadProgression(lang);

  // Les libellés courts des variantes sont indexés par une clé calculée, que
  // le type littéral du dictionnaire ne connaît pas. La lecture passe donc
  // par un accès indexé explicite, avec repli sur le nom complet.
  const libelleVariation = t.variations as Record<
    string,
    { label: string; cue: string } | undefined
  >;

  const barreaux = ladder.variations.map((variation) => ({
    variation,
    label: libelleVariation[variation]?.label ?? progressionLabel(variation, lang),
    cue: libelleVariation[variation]?.cue ?? "",
    points: bestPoints[variation] ?? 0,
    hold: HOLD_TARGET_SECONDS[variation] ?? null,
  }));

  const debloquees = barreaux.filter((b) => b.points > 0).length;
  const meilleur = barreaux.reduce((max, b) => Math.max(max, b.points), 0);
  const meilleureVariation = barreaux.reduce(
    (best, b) => (b.points > best.points ? b : best),
    barreaux[0]
  );
  const tier = tierForPoints(meilleur);
  const couleur = TIER_CANVAS_COLORS[tier];
  const suivant = nextTier(meilleur);

  // Le prochain objectif : le premier barreau non franchi. Un seul est
  // désigné, sinon aucun ne l'est vraiment.
  const prochain = barreaux.findIndex((b) => b.points === 0);

  // Les séances de cette figure seulement : les courbes d'en dessous ne
  // parlent que d'elle.
  const siennes = variations.filter((v) => ladderFamily(v.variation) === figure);

  return (
    <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-8">
      <div className="w-full max-w-md">
        <Link
          href="/progression"
          className="text-[13px] font-medium text-slate-400 hover:text-slate-300"
        >
          ← {t.level.allFigures}
        </Link>
      </div>

      {/* En-tête de la figure */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: couleur, opacity: 0.13 }}
        />

        <div className="relative flex items-center gap-4">
          <FigureMedal tier={tier} size={76} locked={debloquees === 0}>
            <span
              className="font-mono text-[20px] font-bold tabular-nums"
              style={{ color: couleur }}
            >
              {Math.round(meilleur)}
            </span>
          </FigureMedal>

          <div className="min-w-0 flex-1">
            <h1 className="text-[21px] font-bold leading-tight text-white">
              {t.figures[ladder.family].label}
            </h1>
            <p className="text-[12px] text-slate-500">
              {t.figures[ladder.family].tagline}
            </p>

            {debloquees > 0 ? (
              <>
                <p
                  className="mt-1.5 text-[13px] font-semibold"
                  style={{ color: couleur }}
                >
                  {t.result.tiers[tier]} · {meilleureVariation.label}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(tierProgress(meilleur) * 100)}%`,
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
              </>
            ) : (
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
                {t.level.notStartedFigure}
              </p>
            )}
          </div>
        </div>

        <p className="relative mt-3 border-t border-slate-800 pt-2.5 font-mono text-[11px] tabular-nums text-slate-500">
          {t.level.levelsUnlocked(debloquees, barreaux.length)}
        </p>
      </div>

      {/* L'échelle */}
      <div className="w-full max-w-md">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t.level.theLevels}
        </p>

        <ol className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5">
          {barreaux.map((b, i) => {
            const franchi = b.points > 0;
            const palier = tierForPoints(b.points);
            const estProchain = i === prochain;
            const teinte = TIER_CANVAS_COLORS[palier];

            return (
              <li key={b.variation} className="flex gap-3">
                {/* Colonne des médaillons, reliés par un trait : c'est le
                    trait qui fait l'échelle, sans lui ce ne serait qu'une
                    liste de plus. */}
                <div className="flex flex-col items-center">
                  <FigureMedal
                    tier={palier}
                    size={40}
                    locked={!franchi}
                    glow={false}
                  >
                    <span
                      className="font-mono text-[11px] font-bold tabular-nums"
                      style={{ color: teinte }}
                    >
                      {Math.round(b.points)}
                    </span>
                  </FigureMedal>
                  {i < barreaux.length - 1 && (
                    <div className="my-1 w-px flex-1 bg-slate-800" />
                  )}
                </div>

                <div
                  className={`min-w-0 flex-1 ${
                    i < barreaux.length - 1 ? "pb-4" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-[14px] font-semibold leading-tight ${
                        franchi ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {b.label}
                    </p>
                    {franchi ? (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${TIER_STYLES[palier]}`}
                      >
                        {t.result.tiers[palier]}
                      </span>
                    ) : estProchain ? (
                      <span className="shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">
                        {t.level.nextGoal}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-slate-600">
                        {t.level.toUnlock}
                      </span>
                    )}
                  </div>

                  {b.cue && (
                    <p
                      className={`mt-0.5 text-[11px] leading-snug ${
                        franchi || estProchain ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {b.cue}
                    </p>
                  )}

                  {/* L'objectif de durée, là où il existe : c'est le seul
                      chiffre qui dise concrètement ce qu'il reste à faire. */}
                  {b.hold !== null && (
                    <p className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-600">
                      {b.hold}s
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Les courbes, pour cette figure seulement */}
      {siennes.length > 0 && (
        <div className="w-full max-w-md">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t.level.evolution}
          </p>
          <ProgressionDashboard variations={siennes} />
        </div>
      )}
    </div>
  );
}
