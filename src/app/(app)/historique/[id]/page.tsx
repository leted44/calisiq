import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Progression } from "@/lib/pose/grid";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import VideoPoseOverlay from "../../_components/VideoPoseOverlay";
import DeleteSessionButton from "../../_components/DeleteSessionButton";
import { ChangeVideoIcon } from "@/components/icons";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, progression, status, video_url, created_at, performed_at, trim_start, trim_end, hold_duration_seconds, scores(critere, score, valeur_mesuree, valeur_cible), recommendations(exercice, raison)"
    )
    .eq("id", id)
    .single();

  if (!session) notFound();

  const { data: signedUrlData } = await supabase.storage
    .from("videos")
    .createSignedUrl(session.video_url, 3600);

  const scores = (session.scores ?? []).map(
    (s: { critere: string; score: number; valeur_mesuree: number; valeur_cible: number }) => ({
      critere: s.critere as "shoulder_protraction" | "pelvis_deviation" | "hip_angle" | "elbow_angle",
      score: s.score,
      valeurMesuree: s.valeur_mesuree,
      valeurCible: s.valeur_cible,
    })
  );

  const globalScoreValue =
    scores.length > 0 ? scores.reduce((a, s) => a + s.score, 0) / scores.length : 0;

  const initialReport =
    session.status === "done" && scores.length > 0
      ? {
          globalScoreValue,
          scores,
          recommendations: session.recommendations ?? [],
          holdDurationSeconds: session.hold_duration_seconds,
        }
      : null;

  return (
    <div className="flex flex-col items-center gap-4 px-4 pt-10">
      <div className="w-full max-w-md">
        <Link
          href="/historique"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
        >
          ← Historique
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {PROGRESSION_LABELS[session.progression] ?? session.progression}
            </h1>
            <p className="text-xs text-slate-500">
              {session.performed_at
                ? new Date(session.performed_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : new Date(session.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </p>
          </div>
          <DeleteSessionButton
            sessionId={session.id}
            videoPath={session.video_url}
            redirectTo="/historique"
          />
        </div>
      </div>

      <div className="w-full max-w-md">
        {signedUrlData?.signedUrl ? (
          <VideoPoseOverlay
            videoUrl={signedUrlData.signedUrl}
            sessionId={session.id}
            progression={session.progression as Progression}
            trimStart={session.trim_start ?? undefined}
            trimEnd={session.trim_end ?? undefined}
            initialReport={initialReport}
          />
        ) : (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <ChangeVideoIcon className="h-4 w-4" />
            Vidéo introuvable.
          </p>
        )}
      </div>
    </div>
  );
}
