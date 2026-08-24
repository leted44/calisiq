import { createClient } from "@/lib/supabase/server";
import type { Progression } from "@/lib/pose/grid";
import VideoPoseOverlay from "../_components/VideoPoseOverlay";
import DeleteSessionButton from "../_components/DeleteSessionButton";

const PROGRESSION_LABELS: Record<string, string> = {
  tuck_planche: "Tuck planche",
  advanced_tuck_planche: "Advanced tuck planche",
  straddle_planche: "Straddle planche",
  full_planche: "Full planche",
  handstand: "Handstand",
};

const STATUS_LABELS: Record<string, string> = {
  processing: "En attente d'analyse",
  done: "Analysé",
  error: "Erreur",
};

export default async function HistoriquePage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, progression, status, video_url, created_at, trim_start, trim_end")
    .order("created_at", { ascending: false });

  const sessionsWithUrls = await Promise.all(
    (sessions ?? []).map(async (session) => {
      const { data } = await supabase.storage
        .from("videos")
        .createSignedUrl(session.video_url, 3600);
      return { ...session, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="flex flex-col items-center gap-4 px-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Historique</h1>
        <p className="text-sm text-slate-400">Tes figures analysées.</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {sessionsWithUrls.length === 0 && (
          <p className="text-sm text-slate-500">Aucune analyse pour l&apos;instant.</p>
        )}

        {sessionsWithUrls.map((session) => (
          <div
            key={session.id}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
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
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    session.status === "done"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-slate-700/50 text-slate-300"
                  }`}
                >
                  {STATUS_LABELS[session.status] ?? session.status}
                </span>
                <DeleteSessionButton
                  sessionId={session.id}
                  videoPath={session.video_url}
                />
              </div>
            </div>
            {session.signedUrl && (
              <VideoPoseOverlay
                videoUrl={session.signedUrl}
                sessionId={session.id}
                progression={session.progression as Progression}
                trimStart={session.trim_start ?? undefined}
                trimEnd={session.trim_end ?? undefined}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
