import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TabBar from "./_components/TabBar";
import VerifyEmailBanner from "./_components/VerifyEmailBanner";

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
    .select("onboarding_completed, country, email_verified")
    .eq("id", user.id)
    .single();

  // Pays d'origine, relevé une seule fois.
  //
  // POURQUOI ICI ET PAS À L'INSCRIPTION
  //
  // L'en-tête n'existe que sur une requête servie par l'hébergeur, et le
  // formulaire d'inscription parle directement à Supabase depuis le
  // navigateur : le pays n'y passe jamais. Ce layout, lui, est rendu côté
  // serveur à chaque page de l'application, donc la première visite d'un
  // compte existant le renseignera aussi, sans migration de données.
  //
  // Écrit une fois, jamais mis à jour : c'est la provenance à l'inscription
  // qui est utile, pas l'endroit d'où l'on consulte en vacances. L'échec est
  // silencieux — un pays manquant ne doit pas empêcher d'ouvrir l'app.
  if (profile && !profile.country) {
    const pays = (await headers()).get("x-vercel-ip-country");
    if (pays) {
      await supabase
        .from("profiles")
        .update({ country: pays })
        .eq("id", user.id);
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
