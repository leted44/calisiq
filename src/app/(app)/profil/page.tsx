import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../_components/LogoutButton";
import DeleteAccountButton from "../_components/DeleteAccountButton";
import InstallAppButton from "../_components/InstallAppButton";
import {
  RulerIcon,
  ScaleIcon,
  CalendarIcon,
  CrownIcon,
  EditIcon,
  ProfileIcon,
  TrendUpIcon,
} from "@/components/icons";

const SUBSCRIPTION_LABELS: Record<string, string> = {
  free: "Gratuit",
  pro: "Pro",
};

const GENDER_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  autre: "Autre",
};

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select(
          "height_cm, weight_kg, birth_date, gender, avatar_url, subscription_tier, is_admin"
        )
        .eq("id", user.id)
        .single()
    : { data: null };

  const initials = (user?.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Profil</h1>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt="Photo de profil"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 text-base font-semibold text-white">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Connecté en tant que
            </p>
            <p className="mt-1 font-medium text-white">{user?.email}</p>
          </div>
          <Link
            href="/onboarding"
            aria-label="Modifier mon profil"
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-slate-600"
          >
            <EditIcon className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Abonnement
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
              <CrownIcon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">
                CalisIQ {SUBSCRIPTION_LABELS[profile?.subscription_tier ?? "free"] ?? "Gratuit"}
              </p>
              <p className="text-xs text-slate-500">Débloquer l&apos;analyse illimitée</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Informations
          </p>
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 p-4">
              <RulerIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">Taille</p>
              <p className="text-sm text-white">
                {profile?.height_cm ? `${profile.height_cm} cm` : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3 p-4">
              <ScaleIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">Poids</p>
              <p className="text-sm text-white">
                {profile?.weight_kg ? `${profile.weight_kg} kg` : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3 p-4">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">Date de naissance</p>
              <p className="text-sm text-white">
                {profile?.birth_date
                  ? new Date(profile.birth_date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      timeZone: "Europe/Paris",
                    })
                  : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3 p-4">
              <ProfileIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">Sexe</p>
              <p className="text-sm text-white">
                {profile?.gender ? GENDER_LABELS[profile.gender] : "—"}
              </p>
            </div>
          </div>
        </div>

        {profile?.is_admin && (
          <Link
            href="/stats"
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-cyan-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
              <TrendUpIcon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Statistiques</p>
              <p className="text-xs text-slate-500">Usage réel de l&apos;application</p>
            </div>
          </Link>
        )}

        {profile?.is_admin && (
          <Link
            href="/calibration"
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-cyan-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
              <RulerIcon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Calibration</p>
              <p className="text-xs text-slate-500">Mesurer et noter des figures</p>
            </div>
          </Link>
        )}

        {/* Ne s'affiche que si l'installation est réellement possible :
            masqué une fois l'app installée, et masqué aussi sur les
            navigateurs qui ne savent pas le faire. */}
        <InstallAppButton />

        <LogoutButton />

        {/* Séparé du reste et discret : la suppression doit être trouvable
            sans être à portée de pouce d'un geste courant. */}
        <div className="border-t border-slate-800 pt-4">
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
