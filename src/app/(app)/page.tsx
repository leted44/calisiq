import AnalysisForm from "./_components/AnalysisForm";
import { LightbulbIcon, BodyIcon, TimerIcon } from "@/components/icons";

export default function AccueilPage() {
  return (
    <div className="relative flex flex-col items-center gap-8 overflow-hidden px-4 pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-full.png"
          alt="CalisIQ"
          className="h-44 w-auto drop-shadow-[0_0_22px_rgba(34,211,238,0.4)]"
        />
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
          Analyse Intelligente de la Forme
        </p>
      </div>

      <div className="relative w-full max-w-md">
        <p className="text-sm text-slate-400">
          Importe une vidéo ou filme-toi directement pour analyser ta forme avec CalisIQ.
        </p>
      </div>

      <div className="relative grid w-full max-w-md grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
          <LightbulbIcon className="h-5 w-5 text-cyan-400" />
          <span className="text-xs text-slate-400">Bonne lumière</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
          <BodyIcon className="h-5 w-5 text-cyan-400" />
          <span className="text-xs text-slate-400">Corps entier visible</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
          <TimerIcon className="h-5 w-5 text-cyan-400" />
          <span className="text-xs text-slate-400">2-3 sec de hold</span>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <AnalysisForm />
      </div>
    </div>
  );
}
