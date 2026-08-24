import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("height_cm, weight_kg, birth_date, gender, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <OnboardingWizard
        userId={user.id}
        userEmail={user.email ?? ""}
        initialProfile={{
          heightCm: profile?.height_cm ?? null,
          weightKg: profile?.weight_kg ?? null,
          birthDate: profile?.birth_date ?? null,
          gender: profile?.gender ?? null,
          avatarUrl: profile?.avatar_url ?? null,
        }}
      />
    </div>
  );
}
