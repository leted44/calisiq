"use client";

import { useT } from "@/lib/i18n/client";
import {
  VARIATION_DIFFICULTY,
  TIER_CANVAS_COLORS,
  tierForPoints,
  tierProgress,
  nextTier,
  type Tier,
} from "@/lib/pose/level";
import { figureFamily } from "@/lib/pose/report";

/**
 * Le parcours du pratiquant, figure par figure.
 *
 * POURQUOI UN CHEMIN ET PAS UNE LISTE
 *
 * La liste par figure disait déjà où on en est, mais pas où on va. Or c'est la
 * seconde question qui fait revenir : une variation prouvée n'a de sens que
 * rapportée à celles qui l'encadrent, la plus facile qu'on a dépassée et la
 * plus dure qui attend. Un chemin montre les trois d'un seul regard.
 *
 * L'ordre des étapes n'est pas décoratif, c'est celui de VARIATION_DIFFICULTY,
 * la même échelle qui sert à calculer les points. La position sur le chemin et
 * le score viennent donc de la même source, et ne peuvent pas se contredire.
 *
 * CE QUI EST ALLUMÉ, ET CE QUI PULSE
 *
 * Une étape prouvée porte la couleur de son palier. La première non prouvée
 * pulse doucement : c'est la seule information que l'écran met en mouvement,
 * et elle désigne exactement ce qu'il y a à travailler ensuite.
 */

export type JourneyPoints = Record<string, number>;

// Les deux variations de handstand qui ont leur propre famille technique sont
// ramenées ici dans celle du handstand : c'est ainsi que le sélecteur de
// figures les présente, et le parcours doit raconter la même histoire que
// l'écran où l'on choisit sa figure.
const FAMILLES_FONDUES: Record<string, string> = {
  handstand_push_up: "handstand",
  one_arm_handstand: "handstand",
};

function familleDe(variation: string): string {
  const famille = figureFamily(variation);
  return FAMILLES_FONDUES[famille] ?? famille;
}

type Etape = {
  variation: string;
  label: string;
  difficulte: number;
  points: number;
};

type Famille = {
  cle: string;
  label: string;
  etapes: Etape[];
  prouvees: number;
  meilleur: number;
};

export default function LevelJourney({
  points,
  total,
}: {
  points: JourneyPoints;
  total: number;
}) {
  const t = useT();

  const libelleVariation = t.variations as Record<
    string,
    { label: string; cue: string } | undefined
  >;
  const libelleFigure = t.figures as Record<
    string,
    { label: string; tagline: string } | undefined
  >;

  const parFamille = new Map<string, Etape[]>();
  for (const [variation, difficulte] of Object.entries(VARIATION_DIFFICULTY)) {
    const cle = familleDe(variation);
    const etape: Etape = {
      variation,
      label: libelleVariation[variation]?.label ?? variation,
      difficulte,
      points: points[variation] ?? 0,
    };
    parFamille.set(cle, [...(parFamille.get(cle) ?? []), etape]);
  }

  const familles: Famille[] = [...parFamille.entries()]
    .map(([cle, etapes]) => {
      const triees = [...etapes].sort((a, b) => a.difficulte - b.difficulte);
      return {
        cle,
        label: libelleFigure[cle]?.label ?? cle,
        etapes: triees,
        prouvees: triees.filter((e) => e.points > 0).length,
        meilleur: triees.reduce((max, e) => Math.max(max, e.points), 0),
      };
    })
    // La famille la plus avancée d'abord : le parcours s'ouvre sur ce dont on
    // est le plus fier, pas sur un ordre alphabétique qui ne dit rien.
    .sort((a, b) => b.meilleur - a.meilleur);

  const commencees = familles.filter((f) => f.prouvees > 0);
  const aDecouvrir = familles.filter((f) => f.prouvees === 0);

  if (commencees.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="font-medium text-white">{t.empty.noProgressYet}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
          {t.empty.noProgressBody}
        </p>
      </div>
    );
  }

  const palier = tierForPoints(familles[0].meilleur);
  const couleur = TIER_CANVAS_COLORS[palier];
  const avancement = tierProgress(familles[0].meilleur);
  const suivant = nextTier(familles[0].meilleur);

  return (
    <div className="space-y-4">
      <Anneau
        palier={palier}
        couleur={couleur}
        avancement={avancement}
        total={total}
        figures={commencees.length}
        restant={suivant}
        t={t}
      />

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t.level.journey}
        </p>

        {commencees.map((famille) => (
          <Chemin key={famille.cle} famille={famille} t={t} />
        ))}
      </div>

      {aDecouvrir.length > 0 && (
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            {t.level.notStarted}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            {aDecouvrir.map((f) => f.label).join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

// --- Anneau de niveau ---
//
// Un anneau plutôt qu'une barre : il tient dans un carré, donc il peut être
// grand sans pousser le reste de la page vers le bas, et il laisse son centre
// libre pour le chiffre qui compte.
function Anneau({
  palier,
  couleur,
  avancement,
  total,
  figures,
  restant,
  t,
}: {
  palier: Tier;
  couleur: string;
  avancement: number;
  total: number;
  figures: number;
  restant: { tier: Tier; remaining: number } | null;
  t: ReturnType<typeof useT>;
}) {
  const rayon = 54;
  const perimetre = 2 * Math.PI * rayon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5">
      {/* Halo aux couleurs du palier : c'est lui qui fait qu'un légendaire ne
          ressemble pas à un débutant avant même d'avoir lu le mot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
        style={{ backgroundColor: couleur, opacity: 0.12 }}
      />

      <div className="relative flex items-center gap-5">
        <div className="relative h-[132px] w-[132px] shrink-0">
          <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
            <circle
              cx="66"
              cy="66"
              r={rayon}
              fill="none"
              stroke="#1e293b"
              strokeWidth="9"
            />
            <circle
              cx="66"
              cy="66"
              r={rayon}
              fill="none"
              stroke={couleur}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={perimetre}
              strokeDashoffset={perimetre * (1 - avancement)}
              style={{ filter: `drop-shadow(0 0 6px ${couleur}80)` }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono text-[30px] font-bold leading-none tabular-nums"
              style={{ color: couleur }}
            >
              {Math.round(total)}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
              {t.level.total}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t.level.yourLevel}
          </p>
          <p
            className="mt-1 text-[22px] font-bold leading-tight"
            style={{ color: couleur }}
          >
            {t.result.tiers[palier]}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {restant
              ? t.result.toNextTier(
                  Math.ceil(restant.remaining),
                  t.result.tiers[restant.tier]
                )
              : t.result.topTier}
          </p>
          <p className="mt-2.5 border-t border-slate-800 pt-2 font-mono text-[11px] tabular-nums text-slate-500">
            {figures} {t.level.figuresTracked.toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Chemin d'une famille ---
function Chemin({
  famille,
  t,
}: {
  famille: Famille;
  t: ReturnType<typeof useT>;
}) {
  // Première étape non prouvée : c'est elle qu'on met en mouvement, et elle
  // seule. Tout faire clignoter reviendrait à ne rien désigner.
  const prochaine = famille.etapes.findIndex((e) => e.points === 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-baseline justify-between gap-3 px-3.5 pb-2 pt-3">
        <p className="text-sm font-semibold text-white">{famille.label}</p>
        <p className="font-mono text-[11px] tabular-nums text-slate-500">
          {famille.prouvees}/{famille.etapes.length}{" "}
          {famille.prouvees > 1 ? t.level.provenPlural : t.level.proven}
        </p>
      </div>

      {/* Le chemin défile dans son propre conteneur : une famille à six
          variations ne doit pas élargir la page. */}
      <div className="overflow-x-auto px-3.5 pb-4 pt-1">
        <ol className="flex min-w-max items-start gap-0">
          {famille.etapes.map((etape, i) => {
            const prouvee = etape.points > 0;
            const couleur = prouvee
              ? TIER_CANVAS_COLORS[tierForPoints(etape.points)]
              : null;
            const estProchaine = i === prochaine;

            return (
              <li key={etape.variation} className="flex items-start">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="mt-[21px] h-[2px] w-6 shrink-0 rounded-full"
                    style={{
                      backgroundColor: prouvee ? couleur ?? "#1e293b" : "#1e293b",
                      opacity: prouvee ? 0.55 : 1,
                    }}
                  />
                )}

                <div className="flex w-[68px] flex-col items-center gap-1.5">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
                      estProchaine
                        ? "animate-pulse motion-reduce:animate-none"
                        : ""
                    }`}
                    style={
                      prouvee
                        ? {
                            borderColor: couleur ?? undefined,
                            backgroundColor: `${couleur}1f`,
                            boxShadow: `0 0 14px -2px ${couleur}80`,
                          }
                        : {
                            borderColor: estProchaine ? "#475569" : "#1e293b",
                            backgroundColor: "#0b1220",
                          }
                    }
                  >
                    {prouvee ? (
                      <span
                        className="font-mono text-[13px] font-bold tabular-nums"
                        style={{ color: couleur ?? undefined }}
                      >
                        {Math.round(etape.points)}
                      </span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                    )}
                  </span>

                  <span
                    className={`text-center text-[11px] leading-tight ${
                      prouvee
                        ? "font-medium text-slate-300"
                        : estProchaine
                        ? "text-slate-400"
                        : "text-slate-600"
                    }`}
                  >
                    {etape.label}
                  </span>

                  {estProchaine && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-cyan-400/80">
                      {t.level.nextGoal}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
