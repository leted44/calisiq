import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getLang, getDictionary } from "@/lib/i18n/server";
import { progressionLabel } from "@/lib/pose/report";
import { levelPoints, tierForPoints } from "@/lib/pose/level";
import { formatShortDate } from "@/lib/i18n/dates";
import LevelPanel, { type FigureLevel } from "../../(app)/_components/LevelPanel";

type PublicProfile = { handle: string; avatar_url: string | null };

type PublicSession = {
  id: string;
  progression: string;
  performed_at: string | null;
  created_at: string;
  hold_duration_seconds: number | null;
  rep_count: number | null;
  video_url: string;
  score: number | null;
};

// Profil public.
//
// Rendu côté serveur, et pas seulement par habitude : c'est ce qui permet de
// signer les URL des vidéos au moment de la visite, sans copier les fichiers
// dans un second espace de stockage ni exposer le bucket. Dépublier une
// séance lui retire l'accès immédiatement.
//
// Les données passent par deux fonctions SQL plutôt que par des politiques de
// lecture sur les tables. RLS filtre des lignes, pas des colonnes : ouvrir
// `profiles` en lecture publique aurait exposé la taille, le poids, la date
// de naissance et le sexe. Une fonction choisit exactement ce qui sort.
async function loadProfile(handle: string) {
  const supabase = await createClient();
  const [{ data: profil }, { data: seances }] = await Promise.all([
    supabase.rpc("public_profile", { p_handle: handle }),
    supabase.rpc("public_sessions", { p_handle: handle }),
  ]);
  return {
    profile: (profil ?? null) as PublicProfile | null,
    sessions: ((seances ?? []) as PublicSession[]).filter(
      (s) => s.score !== null
    ),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const t = await getDictionary();
  const { profile } = await loadProfile(handle);
  if (!profile) return { title: "CalisIQ" };
  return {
    title: `${t.publish.profileOf(profile.handle)} · CalisIQ`,
    description: t.landing.metaDescription,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const t = await getDictionary();
  const lang = await getLang();
  const { profile, sessions } = await loadProfile(handle);

  if (!profile) notFound();

  const supabase = await createClient();

  // Niveau par figure, calculé sur le MEILLEUR résultat publié de chacune.
  // Même règle que sur la page de progression : ce qui a été prouvé ne
  // s'efface pas parce qu'une séance plus récente s'est moins bien passée.
  const parVariation = new Map<string, number>();
  for (const s of sessions) {
    const points = levelPoints(
      s.progression,
      s.score ?? 0,
      s.hold_duration_seconds
    );
    if (points > (parVariation.get(s.progression) ?? 0)) {
      parVariation.set(s.progression, points);
    }
  }
  const figureLevels: FigureLevel[] = [...parVariation.entries()]
    .filter(([, points]) => points > 0)
    .map(([variation, points]) => ({
      variation,
      label: progressionLabel(variation, lang),
      points,
      tier: tierForPoints(points),
    }))
    .sort((a, b) => b.points - a.points);

  const totalPoints = figureLevels.reduce((somme, f) => somme + f.points, 0);

  // Signature au rendu. Une heure suffit : la page est régénérée à chaque
  // visite, donc chaque visiteur reçoit une URL fraîche.
  const videos = await Promise.all(
    sessions.slice(0, 6).map(async (s) => {
      const { data } = await supabase.storage
        .from("videos")
        .createSignedUrl(s.video_url, 3600);
      return { session: s, url: data?.signedUrl ?? null };
    })
  );

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-16 pt-10">
        <header className="flex items-center gap-3">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 text-base font-semibold text-white">
              {profile.handle.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-mono text-lg font-bold text-white">
              @{profile.handle}
            </p>
            <p className="text-xs text-slate-500">CalisIQ</p>
          </div>
        </header>

        {figureLevels.length > 0 ? (
          <LevelPanel figures={figureLevels} total={totalPoints} />
        ) : (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            {t.publish.emptyProfile}
          </p>
        )}

        {videos.length > 0 && (
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t.publish.publishedFigures}
            </p>
            {videos.map(({ session, url }) => (
              <div
                key={session.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
              >
                {url && (
                  <video
                    src={url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full"
                  />
                )}
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {progressionLabel(session.progression, lang)}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {formatShortDate(
                        session.performed_at ?? session.created_at,
                        lang
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-cyan-400">
                    {(session.score ?? 0).toFixed(1)}
                    <span className="text-xs font-normal text-slate-600">
                      /10
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Appel à l'action : le visiteur d'un profil est exactement la
            personne qu'on veut convertir, et il vient de voir la preuve
            plutôt qu'une promesse. */}
        <Link
          href="/"
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3.5 text-center shadow-[0_0_24px_rgba(34,211,238,0.3)]"
        >
          <span className="block text-[15px] font-semibold text-white">
            {t.publish.cta}
          </span>
          <span className="mt-0.5 block text-xs text-cyan-50/80">
            {t.publish.ctaHint}
          </span>
        </Link>
      </div>
    </main>
  );
}
