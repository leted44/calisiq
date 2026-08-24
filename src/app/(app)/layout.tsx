import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TabBar from "./_components/TabBar";

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
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {children}
      <TabBar />
    </div>
  );
}
