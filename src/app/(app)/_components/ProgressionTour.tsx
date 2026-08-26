"use client";

import { useState } from "react";

type TourStep = {
  target: string;
  title: string;
  description: string;
};

// Chaque étape cible un élément marqué par un attribut data-tour="..." dans
// ProgressionDashboard — au montage on ne garde que celles dont la cible
// existe réellement dans le DOM (ex. le sélecteur de figure n'apparaît que
// si l'utilisateur en a analysé plusieurs), pour ne jamais pointer vers du
// vide. Ce composant n'est monté par le parent que lorsque la visite est
// ouverte, donc ce filtrage se fait une seule fois, au montage.
const STEPS: TourStep[] = [
  {
    target: "progression-variation-selector",
    title: "Change de figure",
    description:
      "Bascule d'un tap entre toutes les figures que tu as déjà analysées plusieurs fois.",
  },
  {
    target: "progression-period-filter",
    title: "Filtre par période",
    description:
      "Concentre-toi sur une fenêtre précise (2 semaines, 1 mois...) ou regarde toute ton histoire sur cette figure.",
  },
  {
    target: "progression-stats",
    title: "Tes chiffres clés",
    description:
      "Nombre de séances, score actuel, record personnel et évolution depuis ta toute première tentative sur cette figure.",
  },
  {
    target: "progression-chart",
    title: "Ta courbe de progression",
    description:
      "Chaque point représente une séance analysée. Touche un point pour afficher sa date et son score exact.",
  },
  {
    target: "progression-hold-chart",
    title: "Ta durée de hold",
    description:
      "Suis aussi combien de temps tu tiens la position, pas seulement la qualité technique — les deux comptent pour progresser.",
  },
  {
    target: "progression-session-link",
    title: "Retrouve le détail",
    description:
      "Une fois un point sélectionné, appuie sur « Voir cette séance » pour rouvrir l'analyse complète : squelette, critères et conseils.",
  },
];

const STORAGE_KEY = "calisiq_seen_progression_tour";
const SPOTLIGHT_PADDING = 6;
const CARD_MARGIN = 12;
const EDGE_INSET = 16;

export function shouldAutoStartProgressionTour(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) !== "1";
}

function measureTarget(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  return el ? el.getBoundingClientRect() : null;
}

function computeAvailableSteps(): TourStep[] {
  return STEPS.filter((s) => document.querySelector(`[data-tour="${s.target}"]`));
}

// Monté par le parent uniquement pendant que la visite est active (pas de
// prop `open` à observer) : tout se calcule au montage ou dans un
// gestionnaire de clic, jamais dans un effet, pour ne jamais déclencher de
// setState en cascade depuis un effet.
export default function ProgressionTour({ onClose }: { onClose: () => void }) {
  const [steps] = useState<TourStep[]>(() => computeAvailableSteps());
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(() =>
    steps[0] ? measureTarget(steps[0].target) : null
  );

  if (steps.length === 0) return null;

  const currentStep = steps[index];
  const isLast = index === steps.length - 1;

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    onClose();
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    const newIndex = index + 1;
    setIndex(newIndex);
    setRect(measureTarget(steps[newIndex].target));
  }

  const viewportH = window.innerHeight;
  const spaceBelow = rect ? viewportH - rect.bottom : 0;
  const placeBelow = !rect || spaceBelow > 200;

  const cardPosition = placeBelow
    ? { top: (rect?.bottom ?? viewportH / 2) + CARD_MARGIN }
    : { bottom: viewportH - (rect?.top ?? viewportH / 2) + CARD_MARGIN };

  return (
    <div className="fixed inset-0 z-50">
      <svg className="absolute inset-0 h-full w-full">
        <mask id="progression-tour-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {rect && (
            <rect
              x={rect.x - SPOTLIGHT_PADDING}
              y={rect.y - SPOTLIGHT_PADDING}
              width={rect.width + SPOTLIGHT_PADDING * 2}
              height={rect.height + SPOTLIGHT_PADDING * 2}
              rx={14}
              fill="black"
            />
          )}
        </mask>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2,6,23,0.85)"
          mask="url(#progression-tour-mask)"
        />
        {rect && (
          <rect
            x={rect.x - SPOTLIGHT_PADDING}
            y={rect.y - SPOTLIGHT_PADDING}
            width={rect.width + SPOTLIGHT_PADDING * 2}
            height={rect.height + SPOTLIGHT_PADDING * 2}
            rx={14}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.6))" }}
          />
        )}
      </svg>

      <div
        className="absolute rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
        style={{ left: EDGE_INSET, right: EDGE_INSET, ...cardPosition }}
      >
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-cyan-400">
            Étape {index + 1}/{steps.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-slate-500 hover:text-slate-300"
          >
            Passer
          </button>
        </div>
        <h3 className="mb-1 text-base font-bold text-white">{currentStep.title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          {currentStep.description}
        </p>
        <button
          type="button"
          onClick={next}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
        >
          {isLast ? "Terminé" : "Suivant"}
        </button>
      </div>
    </div>
  );
}
