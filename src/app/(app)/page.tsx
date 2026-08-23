import AnalysisForm from "./_components/AnalysisForm";

export default function AccueilPage() {
  return (
    <div className="flex flex-col items-center gap-8 px-4 pt-10">
      <div className="w-full max-w-md space-y-1">
        <h1 className="text-2xl font-bold text-white">Nouvelle analyse</h1>
        <p className="text-sm text-slate-400">
          Importe une vidéo ou filme-toi directement pour analyser ta forme.
        </p>
      </div>

      <div className="grid w-full max-w-md grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
          <span className="text-lg">💡</span>
          <span className="text-xs text-slate-400">Bonne lumière</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
          <span className="text-lg">🧍</span>
          <span className="text-xs text-slate-400">Corps entier visible</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
          <span className="text-lg">⏱️</span>
          <span className="text-xs text-slate-400">2-3 sec de hold</span>
        </div>
      </div>

      <AnalysisForm />
    </div>
  );
}
