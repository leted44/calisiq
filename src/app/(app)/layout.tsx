import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TabBar from "./_components/TabBar";
import VerifyEmailBanner from "./_components/VerifyEmailBanner";
import { platformFromUserAgent, browserFromUserAgent } from "@/lib/device";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, country, platform, email_verified")
    .eq("id", user.id)
    .single();

  // Provenance et appareil, relevés une seule fois.
  //
  // POURQUOI ICI ET PAS À L'INSCRIPTION
  //
  // Ces en-têtes n'existent que sur une requête servie par l'hébergeur, et le
  // formulaire d'inscription parle directement à Supabase depuis le
  // navigateur : rien n'y passe. Ce layout, lui, est rendu côté serveur à
  // chaque page de l'application, donc la première visite d'un compte
  // existant le renseignera aussi, sans migration de données.
  //
  // Écrits une fois, jamais mis à jour. Le pays d'inscription est ce qui dit
  // d'où vient quelqu'un, pas l'endroit d'où il consulte en vacances ; et
  // c'est l'appareil d'ARRIVÉE qui explique un échec de prise en main, celui
  // d'une consultation trois mois plus tard ne dit plus rien de ce moment-là.
  //
  // Une seule écriture pour les deux, conditionnée au pays comme au reste :
  // l'échec est silencieux, un champ manquant ne doit pas empêcher d'ouvrir
  // l'application.
  if (profile && (!profile.country || !profile.platform)) {
    const entetes = await headers();
    const pays = entetes.get("x-vercel-ip-country");
    const ua = entetes.get("user-agent");

    const champs: Record<string, string> = {};
    if (!profile.country && pays) champs.country = pays;
    if (!profile.platform) {
      const plateforme = platformFromUserAgent(ua);
      const navigateur = browserFromUserAgent(ua);
      if (plateforme) champs.platform = plateforme;
      if (navigateur) champs.browser = navigateur;
    }

    if (Object.keys(champs).length > 0) {
      await supabase.from("profiles").update(champs).eq("id", user.id);
    }
  }

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Le rappel de confirmation, au-dessus de la page et non à sa place : il
  // n'interdit rien, il prévient. Voir VerifyEmailBanner pour le raisonnement.
  //
  // Le repli sur `true` quand la colonne est absente est délibéré : tant que
  // la migration n'est pas appliquée, mieux vaut ne rien afficher que de
  // réclamer une confirmation à des comptes qui l'ont déjà faite.
  const adresseAConfirmer =
    profile?.email_verified === false && Boolean(user.email);

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {adresseAConfirmer && (
        <div className="px-4 pt-4">
          <VerifyEmailBanner email={user.email as string} />
        </div>
      )}
      {children}
      <TabBar />
    </div>
  );
}
