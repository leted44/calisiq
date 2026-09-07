import Link from "next/link";
import type { CriterionScore } from "@/lib/pose/scoring";
import { recommendationsFor } from "@/lib/pose/recommendations";
import { getLang } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Progression } from "@/lib/pose/grid";
import { PROGRESSION_LABELS } from "@/lib/pose/report";
import VideoPoseOverlay from "../../_components/VideoPoseOverlay";
import DeleteSessionButton from "../../_components/DeleteSessionButton";
import ReferenceSessionToggle from "../../_components/ReferenceSessionToggle";
import { ChangeVideoIcon } from "@/components/icons";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const lang = await getLang();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, progression, status, video_url, created_at, performed_at, trim_start, trim_end, hold_duration_seconds, rep_count, is_reference, scores(critere, score, valeur_mesuree, valeur_cible), recommendations(exercice, raison)"
    )
    .eq("id", id)
    .single();

  if (!session) notFound();

  const { data: signedUrlData } = await supabase.storage
    .from("videos")
    .createSignedUrl(session.video_url, 3600);

  const scores = (session.scores ?? []).map(
    (s: { critere: string; score: number; valeur_mesuree: number; valeur_cible: number }) => ({
      // Type complet et non une liste de quatre critères : la base en stocke
      // dix-sept, et cette énumération datait d'une époque où la planche était
      // la seule figure. Elle empêchait de reconnaître les critères ajoutés
      // depuis, à commencer par ceux des exercices à répétition.
      critere: s.critere as CriterionScore["critere"],
      score: s.score,
      valeurMesuree: s.valeur_mesuree,
      valeurCible: s.valeur_cible,
    })
  );

  const globalScoreValue =
    scores.length > 0 ? scores.reduce((a, s) => a + s.score, 0) / scores.length : 0;
  const weakest =
    scores.length > 0
      ? scores.reduce((worst, s) => (s.score < worst.score ? s : worst))
      : null;

  const initialReport =
    session.status === "done" && scores.length > 0
      && weakest
      ? {
          globalScoreValue,
          scores,
          // Régénérées à partir des mesures plutôt que lues en base.
          //
          // Les recommandations y sont enregistrées sous forme de texte, dans
          // la langue en vigueur au moment de l'analyse : une séance analysée
          // en français restait donc française sur un écran passé en anglais.
          // Les scores, eux, sont stockés en clair et contiennent tout ce
          // qu'il faut pour reconstruire le conseil. On dérive le texte des
          // mesures, ce qui le rend juste dans les deux langues, y compris
          // pour les séances antérieures à la traduction.
          recommendations: recommendationsFor(
            weakest.critere,
            weakest.score,
            // Signe de l'écart de bassin : disponible seulement si la séance
            // porte le critère signé. Sinon zéro, qui oriente vers le conseil
            // d'affaissement — le cas le plus fréquent et le plus grave.
            scores.find((s) => s.critere === "pelvis_sag")?.valeurMesuree ?? 0,
            weakest.valeurMesuree - weakest.valeurCible,
            session.progression,
            lang
          ),
          holdDurationSeconds: session.hold_duration_seconds,
          repCount: session.rep_count,
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
                    timeZone: "Europe/Paris",
                  })
                : new Date(session.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Paris",
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

      <div className="w-full max-w-md pb-4">
        <ReferenceSessionToggle
          sessionId={session.id}
          isReference={session.is_reference ?? false}
        />
      </div>
    </div>
  );
}
