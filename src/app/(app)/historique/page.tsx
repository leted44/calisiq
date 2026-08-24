import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatHoldDuration, PROGRESSION_LABELS } from "@/lib/pose/report";

const STATUS_LABELS: Record<string, string> = {
  processing: "En attente d'analyse",
  done: "Analysé",
  error: "Erreur",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-cyan-400";
  return "text-orange-400";
}

export default async function HistoriquePage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, progression, status, created_at, hold_duration_seconds, scores(score)"
    )
    .order("created_at", { ascending: false });

  const rows = (sessions ?? []).map((session) => {
    const scoreValues = (session.scores ?? []).map((s: { score: number }) => s.score);
    const globalScore =
      scoreValues.length > 0
        ? scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length
        : null;
    return { ...session, globalScore };
  });

  return (
    <div className="flex flex-col items-center gap-4 px-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Historique</h1>
        <p className="text-sm text-slate-400">Tes figures analysées.</p>
      </div>

      <div className="w-full max-w-md space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-slate-500">Aucune analyse pour l&apos;instant.</p>
        )}

        {rows.map((session) => (
          <Link
            key={session.id}
            href={`/historique/${session.id}`}
            className="block space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-cyan-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">
                  {PROGRESSION_LABELS[session.progression] ?? session.progression}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(session.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  session.status === "done"
                    ? "bg-green-500/15 text-green-400"
                    : "bg-slate-700/50 text-slate-300"
                }`}
              >
                {STATUS_LABELS[session.status] ?? session.status}
              </span>
            </div>

            {(session.globalScore !== null || session.hold_duration_seconds !== null) && (
              <div className="flex flex-wrap gap-2">
                {session.globalScore !== null && (
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    Score{" "}
                    <span className={`font-semibold ${scoreColor(session.globalScore)}`}>
                      {session.globalScore.toFixed(1)}/10
                    </span>
                  </span>
                )}
                {session.hold_duration_seconds !== null && (
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    Hold{" "}
                    <span className="font-semibold text-white">
                      {formatHoldDuration(session.hold_duration_seconds)}
                    </span>
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
