"use client";

import {
  BodyIcon,
  JointIcon,
  LightbulbIcon,
  StableIcon,
  AngleWarningIcon,
} from "@/components/icons";

const TIPS = [
  { Icon: BodyIcon, text: "Cadre ton corps en entier, de la tête aux pieds." },
  { Icon: JointIcon, text: "Évite les vêtements amples qui cachent tes articulations." },
  { Icon: LightbulbIcon, text: "Filme dans un endroit bien éclairé." },
  { Icon: StableIcon, text: "Stabilise la caméra (trépied ou support fixe)." },
  { Icon: AngleWarningIcon, text: "Place la caméra à hauteur du buste, sans contre-plongée." },
];

// En straddle, les jambes sont écartées de part et d'autre du corps : une
// caméra pile de face ou pile de profil fait que les deux jambes se
// superposent à l'écran, et l'app perd le suivi d'une des deux.
const STRADDLE_TIP = {
  Icon: AngleWarningIcon,
  text: "Straddle : filme légèrement de biais (pas totalement de face ni de profil) pour bien distinguer tes deux jambes.",
};

export const HIDE_TIPS_KEY = "calisiq_hide_capture_tips";

export function shouldSkipTips(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HIDE_TIPS_KEY) === "1";
}

export default function CaptureTipsModal({
  onContinue,
  onClose,
  isStraddle = false,
}: {
  onContinue: () => void;
  onClose: () => void;
  isStraddle?: boolean;
}) {
  function handleContinue(hide: boolean) {
    if (hide) {
      window.localStorage.setItem(HIDE_TIPS_KEY, "1");
    }
    onContinue();
  }

  const tips = isStraddle ? [...TIPS, STRADDLE_TIP] : TIPS;

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="w-full max-w-md space-y-5 rounded-t-2xl border border-slate-800 bg-slate-900 p-6 sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
              Avant de continuer
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              Pour une analyse fiable
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full border border-slate-700 p-1.5 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <ul className="space-y-3">
          {tips.map(({ Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/50 px-3 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                <Icon />
              </span>
              <span className="text-sm text-slate-200">{text}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => handleContinue(false)}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
        >
          Continuer
        </button>
        <button
          type="button"
          onClick={() => handleContinue(true)}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-400"
        >
          Ne plus me le rappeler
        </button>
      </div>
    </div>
  );
}
