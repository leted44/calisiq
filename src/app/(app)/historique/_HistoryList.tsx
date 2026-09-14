"use client";

import Link from "next/link";
import { useState } from "react";
import { useT, useLang } from "@/lib/i18n/client";
import { formatMonthYear, formatWeekdayDay } from "@/lib/i18n/dates";
import { formatHoldDuration } from "@/lib/pose/report";
import { FIGURE_COLORS } from "@/lib/pose/activity";
import { CrownIcon, TimerIcon } from "@/components/icons";

/**
 * L'historique, réorganisé.
 *
 * CE QUI NE MARCHAIT PLUS
 *
 * Soixante-deux cartes identiques, empilées dans l'ordre. À dix séances la
 * liste se lisait ; à soixante elle ne servait plus à rien, parce qu'elle ne
 * répondait à aucune des questions qu'on se pose devant un historique :
 * qu'est-ce que j'ai fait ce mois-ci, où en est telle figure, quel est mon
 * meilleur essai. Tout y était, rien ne s'y trouvait.
 *
 * TROIS CHOSES, ET PAS UNE DE PLUS
 *
 * Un filtre par figure, parce que c'est ainsi qu'on cherche : on pense à une
 * figure, pas à une date. Un regroupement par mois, parce que c'est l'échelle
 * à laquelle un entraînement se raconte. Et le meilleur essai de chaque figure
 * marqué d'une couronne, parce qu'une liste sans relief est une liste qu'on ne
 * parcourt pas.
 *
 * Les lignes remplacent les cartes : à soixante entrées, la densité est une
 * qualité. Le rail coloré à gauche dit la figure sans qu'on lise son nom, et
 * c'est la même couleur que dans la répartition des entraînements — deux
 * écrans qui parlent des mêmes figures doivent les peindre pareil.
 */

export type HistoryRow = {
  id: string;
  progression: string;
  label: string;
  family: string;
  status: string;
  date: string;
  score: number | null;
  holdSeconds: number | null;
  reps: number | null;
  isReference: boolean;
  isBest: boolean;
};

export type FigureFilter = { family: string; label: string; count: number };

function scoreColor(score: number): string {
  if (score >= 8) return "#4ade80";
  if (score >= 6) return "#22d3ee";
  return "#fb923c";
}

export default function HistoryList({
  rows,
  figures,
}: {
  rows: HistoryRow[];
  figures: FigureFilter[];
}) {
  const t = useT();
  const lang = useLang();
  const [filtre, setFiltre] = useState<string | null>(null);

  const visibles = filtre ? rows.filter((r) => r.family === filtre) : rows;

  // Regroupement par mois. Les lignes arrivent déjà triées de la plus récente
  // à la plus ancienne, donc l'ordre des mois se déduit de leur parcours : pas
  // de tri supplémentaire, et aucun risque qu'il contredise celui des lignes.
  const mois: { cle: string; label: string; lignes: HistoryRow[] }[] = [];
  for (const ligne of visibles) {
    const cle = ligne.date.slice(0, 7);
    const dernier = mois[mois.length - 1];
    if (dernier && dernier.cle === cle) {
      dernier.lignes.push(ligne);
    } else {
      mois.push({
        cle,
        label: formatMonthYear(ligne.date, lang),
        lignes: [ligne],
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtre par figure. Chaque pastille porte la couleur de sa figure,
          allumée quand elle est active : on retrouve d'un coup d'oeil le code
          couleur du camembert de la page de progression. */}
      {figures.length > 1 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-1.5 pb-1">
            <Puce
              actif={filtre === null}
              couleur="#94a3b8"
              label={t.history.all}
              compte={rows.length}
              onClick={() => setFiltre(null)}
            />
            {figures.map((f) => (
              <Puce
                key={f.family}
                actif={filtre === f.family}
                couleur={FIGURE_COLORS[f.family] ?? "#94a3b8"}
                label={f.label}
                compte={f.count}
                onClick={() => setFiltre(f.family)}
              />
            ))}
          </div>
        </div>
      )}

      {visibles.length === 0 && (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          {t.history.noneForFigure}
        </p>
      )}

      {mois.map((groupe) => (
        <div key={groupe.cle}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 first-letter:uppercase">
              {groupe.label}
            </p>
            <p className="font-mono text-[10px] tabular-nums text-slate-600">
              {t.history.analyses(groupe.lignes.length)}
            </p>
          </div>

          <ul className="divide-y divide-slate-800/70 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            {groupe.lignes.map((ligne) => (
              <li key={ligne.id}>
                <Ligne ligne={ligne} lang={lang} t={t} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Puce({
  actif,
  couleur,
  label,
  compte,
  onClick,
}: {
  actif: boolean;
  couleur: string;
  label: string;
  compte: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors"
      style={{
        borderColor: actif ? couleur : "#1e293b",
        backgroundColor: actif ? `${couleur}1a` : "transparent",
        color: actif ? couleur : "#94a3b8",
      }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: couleur,
          boxShadow: actif ? `0 0 6px ${couleur}` : undefined,
        }}
      />
      {label}
      <span className="font-mono text-[10px] tabular-nums opacity-60">{compte}</span>
    </button>
  );
}

function Ligne({
  ligne,
  lang,
  t,
}: {
  ligne: HistoryRow;
  lang: ReturnType<typeof useLang>;
  t: ReturnType<typeof useT>;
}) {
  const couleur = FIGURE_COLORS[ligne.family] ?? "#64748b";
  const termine = ligne.status === "done" && ligne.score !== null;

  return (
    <Link
      href={`/historique/${ligne.id}`}
      className="flex items-stretch gap-3 py-2.5 pl-0 pr-3.5 transition-colors hover:bg-slate-800/40"
    >
      {/* Rail de couleur : il dit la figure avant qu'on ait lu son nom, et
          rend la liste parcourable en diagonale. */}
      <span
        className="w-[3px] shrink-0 rounded-r-full"
        style={{ backgroundColor: couleur }}
      />

      <div className="min-w-0 flex-1 py-0.5">
        <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-white">
          {ligne.label}
          {ligne.isBest && (
            <CrownIcon className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          )}
          {ligne.isReference && (
            <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300">
              {t.empty.reference}
            </span>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="first-letter:uppercase">
            {formatWeekdayDay(ligne.date, lang)}
          </span>
          {ligne.holdSeconds !== null && (
            <span className="flex items-center gap-1">
              <TimerIcon className="h-3 w-3" />
              {formatHoldDuration(ligne.holdSeconds)}
            </span>
          )}
          {ligne.reps !== null && <span>{ligne.reps} reps</span>}
        </p>
      </div>

      {termine ? (
        <div className="flex shrink-0 flex-col items-end justify-center">
          <span
            className="font-mono text-[17px] font-bold leading-none tabular-nums"
            style={{ color: scoreColor(ligne.score as number) }}
          >
            {(ligne.score as number).toFixed(1)}
          </span>
          <span className="text-[9px] text-slate-600">/10</span>
        </div>
      ) : (
        <div className="flex shrink-0 items-center">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              ligne.status === "error"
                ? "bg-red-500/10 text-red-400"
                : "bg-slate-700/50 text-slate-400"
            }`}
          >
            {ligne.status === "error"
              ? t.history.statusError
              : t.history.statusProcessing}
          </span>
        </div>
      )}
    </Link>
  );
}
