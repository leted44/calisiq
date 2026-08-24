import CalibrationForm from "./CalibrationForm";

export default function CalibrationPage() {
  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Calibration</h1>
        <p className="text-sm text-slate-400">
          Outil interne : mesure les angles réels d&apos;une figure pas
          encore calibrée et enregistre un échantillon avec ta propre note.
        </p>
      </div>
      <div className="w-full max-w-md">
        <CalibrationForm />
      </div>
    </div>
  );
}
