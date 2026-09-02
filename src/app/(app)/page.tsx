import AnalysisForm from "./_components/AnalysisForm";
import { LightbulbIcon, BodyIcon, TimerIcon } from "@/components/icons";

export default function AccueilPage() {
  return (
    <div className="relative flex flex-col items-center gap-8 overflow-hidden px-4 pt-10">
      <div className="relative flex flex-col items-center gap-2">
        {/* Hauteur ramenée de 176 à 160 px : le nouveau logo est presque
            carré, il occupe donc bien plus de surface qu'avant à hauteur
            égale, et repoussait le sélecteur de figures hors de l'écran.
            Composé en `screen`, comme sur l'écran de connexion : le halo cyan
            qui baignait cette zone a été retiré, il serait passé au travers
            des noirs du logo. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-full.webp"
          alt="CalisIQ"
          className="h-40 w-auto mix-blend-screen"
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
