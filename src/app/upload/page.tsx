import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Progression } from "@/lib/pose/grid";
import UploadForm from "./UploadForm";
import VideoPoseOverlay from "./VideoPoseOverlay";

const PROGRESSION_LABELS: Record<string, string> = {
  tuck_planche: "Tuck planche",
  advanced_tuck_planche: "Advanced tuck planche",
  straddle_planche: "Straddle planche",
  full_planche: "Full planche",
};

const STATUS_LABELS: Record<string, string> = {
  processing: "En attente d'analyse",
  done: "Analysé",
  error: "Erreur",
};

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, progression, status, video_url, created_at")
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
    <div className="flex min-h-screen flex-col items-center gap-8 bg-slate-950 p-4 py-10">
      <UploadForm />

      <div className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Mes holds</h2>

        {sessionsWithUrls.length === 0 && (
          <p className="text-sm text-slate-500">Aucun upload pour l&apos;instant.</p>
        )}

        {sessionsWithUrls.map((session) => (
          <div
            key={session.id}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">
                {PROGRESSION_LABELS[session.progression] ?? session.progression}
              </p>
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
            {session.signedUrl && (
              <VideoPoseOverlay
                videoUrl={session.signedUrl}
                sessionId={session.id}
                progression={session.progression as Progression}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
