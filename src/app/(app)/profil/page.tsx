import Link from "next/link";
import { formatLongDate } from "@/lib/i18n/dates";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../_components/LogoutButton";
import DeleteAccountButton from "../_components/DeleteAccountButton";
import InstallAppButton from "../_components/InstallAppButton";
import LanguageSwitcher from "../_components/LanguageSwitcher";
import ClaimHandleCard from "../_components/ClaimHandleCard";
import {
  RulerIcon,
  ScaleIcon,
  CalendarIcon,
  CrownIcon,
  EditIcon,
  ProfileIcon,
  TrendUpIcon,
} from "@/components/icons";
import { getDictionary, getLang } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/fr";

// Résolus depuis le dictionnaire au rendu : ces libellés traduisent une
// valeur stockée en base, dont les clés restent françaises et le resteront —
// renommer des données pour une question d'affichage serait payer très cher
// une traduction.
function subscriptionLabel(tier: string | null | undefined, t: Dictionary) {
  return tier === "pro" ? t.profile.tierPro : t.profile.tierFree;
}

function genderLabel(gender: string | null | undefined, t: Dictionary) {
  if (gender === "homme") return t.profile.genderMale;
  if (gender === "femme") return t.profile.genderFemale;
  if (gender === "autre") return t.profile.genderOther;
  return "—";
}

export default async function ProfilPage() {
  const t = await getDictionary();
  const lang = await getLang();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select(
          "handle, height_cm, weight_kg, birth_date, gender, avatar_url, subscription_tier, is_admin"
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
              {t.profile.signedInAs}
            </p>
            <p className="mt-1 font-medium text-white">{user?.email}</p>
          </div>
          <Link
            href="/onboarding"
            aria-label={t.profile.editProfile}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-slate-600"
          >
            <EditIcon className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t.profile.subscription}
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
              <CrownIcon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">
                CalisIQ {subscriptionLabel(profile?.subscription_tier, t)}
              </p>
              <p className="text-xs text-slate-500">{t.profile.subscriptionHint}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t.profile.info}
          </p>
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 p-4">
              <RulerIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">{t.profile.height}</p>
              <p className="text-sm text-white">
                {profile?.height_cm ? `${profile.height_cm} cm` : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3 p-4">
              <ScaleIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">{t.profile.weight}</p>
              <p className="text-sm text-white">
                {profile?.weight_kg ? `${profile.weight_kg} kg` : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3 p-4">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">{t.profile.birthDate}</p>
              <p className="text-sm text-white">
                {profile?.birth_date
                  ? formatLongDate(profile.birth_date, lang)
                  : "—"}
              </p>
            </div>
            <div className="flex items-center gap-3 p-4">
              <ProfileIcon className="h-4 w-4 text-slate-500" />
              <p className="flex-1 text-sm text-slate-300">{t.profile.gender}</p>
              <p className="text-sm text-white">
                {genderLabel(profile?.gender, t)}
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
              <p className="font-medium text-white">{t.profile.stats}</p>
              <p className="text-xs text-slate-500">{t.profile.statsHint}</p>
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
              <p className="font-medium text-white">{t.profile.calibration}</p>
              <p className="text-xs text-slate-500">{t.empty.calibrationHint}</p>
            </div>
          </Link>
        )}

        {/* Toujours visible, avec deux états : « Installer CalisIQ » tant que
            ce n'est pas fait, « CalisIQ est bien installé » une fois lancée
            depuis l'écran d'accueil. Un bouton qui se cache quand le
            navigateur n'expose pas d'invite native laisserait l'utilisateur
            sans réponse ; il déplie alors la marche à suivre. */}
        <InstallAppButton />

        {/* Avant les réglages : le pseudo est une identité, pas une
            préférence, et il conditionne le profil public. */}
        <ClaimHandleCard currentHandle={profile?.handle ?? null} />

        {/* Au-dessus de la déconnexion : c'est un réglage, pas une sortie. */}
        <LanguageSwitcher />

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
