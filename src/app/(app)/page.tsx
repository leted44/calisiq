import AnalysisForm from "./_components/AnalysisForm";
import { LightbulbIcon, BodyIcon, TimerIcon } from "@/components/icons";

export default function AccueilPage() {
  return (
    <div className="relative flex flex-col items-center gap-8 overflow-hidden px-4 pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="CalisIQ"
        className="relative h-16 w-auto drop-shadow-[0_0_18px_rgba(34,211,238,0.35)]"
      />

      <div className="relative w-full max-w-md space-y-1">
        <h1 className="text-2xl font-bold text-white">Nouvelle analyse</h1>
        <p className="text-sm text-slate-400">
          Importe une vidéo ou filme-toi directement pour analyser ta forme.
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
