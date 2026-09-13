import type { Dictionary } from "@/lib/i18n/fr";
import { CalendarIcon, FlameIcon, TrendUpIcon, PieIcon } from "@/components/icons";
import type { PointHebdo, Part } from "@/lib/pose/activity";
import { FIGURE_COLORS } from "@/lib/pose/activity";

/**
 * Les trois panneaux d'activité de la page de progression.
 *
 * Ils ne servent pas le même besoin que la collection de figures juste
 * au-dessus. Celle-ci dit ce qui est acquis, eux disent ce qui se passe en ce
 * moment : combien de séances cette semaine, depuis combien de jours sans
 * interruption, comment le niveau a monté, et sur quoi le travail porte
 * réellement. Le premier motive par la performance, les seconds par la
 * régularité, et la régularité est la seule chose sur laquelle on ait prise
 * tous les jours.
 *
 * Chacun se calcule à partir des séances déjà chargées. Rien n'y est estimé :
 * une statistique fabriquée décrédibiliserait les vraies.
 */

function Carte({
  titre,
  icone,
  children,
  aside,
}: {
  titre: string;
  icone: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">{icone}</span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            {titre}
          </p>
        </div>
        {aside}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

// --- Ma semaine ---
//
// Trois chiffres, pas dix. La série de jours est mise au milieu et en ambre :
// c'est la seule qu'on perd en ne faisant rien, donc la seule qui se regarde
// tous les jours.
export function WeekStrip({
  seancesSemaine,
  serie,
  total,
  t,
}: {
  seancesSemaine: number;
  serie: number;
  total: number;
  t: Dictionary;
}) {
  return (
    <Carte titre={t.progressPage.thisWeek} icone={<CalendarIcon className="h-4 w-4" />}>
      <div className="grid grid-cols-3 gap-2">
        <Tuile
          valeur={seancesSemaine}
          label={t.progressPage.sessionsThisWeek}
          couleur="#38bdf8"
          icone={<CalendarIcon className="h-4 w-4" />}
        />
        <Tuile
          valeur={serie}
          label={t.progressPage.streak}
          couleur="#fbbf24"
          icone={<FlameIcon className="h-4 w-4" />}
        />
        <Tuile
          valeur={total}
          label={t.progressPage.totalAnalyses}
          couleur="#4ade80"
          icone={<TrendUpIcon className="h-4 w-4" />}
        />
      </div>
    </Carte>
  );
}

function Tuile({
  valeur,
  label,
  couleur,
  icone,
}: {
  valeur: number;
  label: string;
  couleur: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 px-2 py-3">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: `${couleur}1f`, color: couleur }}
      >
        {icone}
      </span>
      <span
        className="font-mono text-[19px] font-bold leading-none tabular-nums"
        style={{ color: couleur }}
      >
        {valeur}
      </span>
      <span className="text-center text-[10px] leading-tight text-slate-500">
        {label}
      </span>
    </div>
  );
}

// --- Ma progression globale ---
//
// Une aire plutôt qu'une simple ligne : la surface sous la courbe donne du
// poids au chemin parcouru, ce qu'une ligne d'un pixel ne fait pas. Le dernier
// point porte un halo, parce que c'est là qu'on en est.
export function GlobalCurve({
  semaines,
  t,
}: {
  semaines: PointHebdo[];
  t: Dictionary;
}) {
  const LARGEUR = 320;
  const HAUTEUR = 96;
  const MARGE_X = 6;
  const MARGE_HAUT = 10;
  const MARGE_BAS = 16;

  const max = Math.max(...semaines.map((s) => s.points), 1);
  const x = (i: number) =>
    MARGE_X + (i / Math.max(1, semaines.length - 1)) * (LARGEUR - MARGE_X * 2);
  const y = (p: number) =>
    MARGE_HAUT + (1 - p / max) * (HAUTEUR - MARGE_HAUT - MARGE_BAS);

  const points = semaines.map((s, i) => ({ x: x(i), y: y(s.points) }));
  const ligne = points.map((p) => `${p.x},${p.y}`).join(" ");
  const aire = `${ligne} ${points[points.length - 1].x},${HAUTEUR - MARGE_BAS} ${points[0].x},${HAUTEUR - MARGE_BAS}`;
  const dernier = points[points.length - 1];
  const actuel = semaines[semaines.length - 1].points;
  const gagnes = actuel - semaines[0].points;

  return (
    <Carte
      titre={t.progressPage.globalCurve}
      icone={<TrendUpIcon className="h-4 w-4" />}
      aside={
        gagnes > 0 ? (
          <span className="font-mono text-[11px] font-semibold tabular-nums text-green-400">
            +{Math.round(gagnes)}
          </span>
        ) : null
      }
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[26px] font-bold leading-none tabular-nums text-white">
          {Math.round(actuel)}
        </span>
        <span className="text-[11px] text-slate-500">{t.level.total}</span>
      </div>

      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="mt-2 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="courbe-globale" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={MARGE_X}
          x2={LARGEUR - MARGE_X}
          y1={HAUTEUR - MARGE_BAS}
          y2={HAUTEUR - MARGE_BAS}
          stroke="#1e293b"
          strokeWidth="1"
        />
        <polygon points={aire} fill="url(#courbe-globale)" />
        <polyline
          points={ligne}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={dernier.x} cy={dernier.y} r="6" fill="#38bdf8" opacity="0.25" />
        <circle
          cx={dernier.x}
          cy={dernier.y}
          r="3"
          fill="#0b1220"
          stroke="#38bdf8"
          strokeWidth="2"
        />
      </svg>

      <div className="mt-1 flex justify-between text-[9px] text-slate-600">
        <span>{semaines[0].label}</span>
        <span>{t.progressPage.lastWeeks}</span>
        <span>{semaines[semaines.length - 1].label}</span>
      </div>
    </Carte>
  );
}

// --- Répartition des entraînements ---
//
// Un anneau et non un disque plein : le centre libre porte le nombre de
// séances, qui est l'échelle sans laquelle des pourcentages ne veulent rien
// dire. Trente pour cent de douze séances et trente pour cent de deux ne
// racontent pas la même histoire.
export function TrainingSplit({
  parts,
  labels,
  total,
  t,
}: {
  parts: Part[];
  labels: Record<string, string>;
  total: number;
  t: Dictionary;
}) {
  const RAYON = 42;
  const EPAISSEUR = 16;
  const perimetre = 2 * Math.PI * RAYON;

  const arcs = parts.reduce<
    { family: string; couleur: string; longueur: number; decalage: number }[]
  >((acc, part) => {
    const debut = acc.reduce((somme, a) => somme + a.longueur + 2, 0);
    return [
      ...acc,
      {
        family: part.family,
        couleur: FIGURE_COLORS[part.family] ?? "#64748b",
        // Un fin liseré entre deux parts : sans lui, deux couleurs voisines
        // se touchent et l'anneau paraît continu.
        longueur: Math.max(0, part.share * perimetre - 2),
        decalage: -debut,
      },
    ];
  }, []);

  return (
    <Carte titre={t.progressPage.split} icone={<PieIcon className="h-4 w-4" />}>
      <div className="flex items-center gap-4">
        <div className="relative h-[112px] w-[112px] shrink-0">
          <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
            <circle
              cx="56"
              cy="56"
              r={RAYON}
              fill="none"
              stroke="#1e293b"
              strokeWidth={EPAISSEUR}
            />
            {arcs.map((arc) => (
              <circle
                key={arc.family}
                cx="56"
                cy="56"
                r={RAYON}
                fill="none"
                stroke={arc.couleur}
                strokeWidth={EPAISSEUR}
                strokeDasharray={`${arc.longueur} ${perimetre}`}
                strokeDashoffset={arc.decalage}
                strokeLinecap="butt"
                style={{ filter: `drop-shadow(0 0 5px ${arc.couleur}99)` }}
              />
            ))}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[22px] font-bold leading-none tabular-nums text-white">
              {total}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-500">
              {total > 1 ? t.progressPage.sessionsWord : t.progressPage.sessionWord}
            </span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-1.5">
          {parts.map((part) => (
            <li key={part.family} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: FIGURE_COLORS[part.family] ?? "#64748b",
                  boxShadow: `0 0 7px ${FIGURE_COLORS[part.family] ?? "#64748b"}`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-200">
                {labels[part.family] ?? part.family}
              </span>
              <span
                className="shrink-0 font-mono text-[12px] font-semibold tabular-nums"
                style={{ color: FIGURE_COLORS[part.family] ?? "#94a3b8" }}
              >
                {Math.round(part.share * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Carte>
  );
}
