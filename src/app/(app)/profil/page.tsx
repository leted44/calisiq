import { createClient } from "@/lib/supabase/server";
import LogoutButton from "../_components/LogoutButton";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Profil</h1>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Connecté en tant que
          </p>
          <p className="mt-1 font-medium text-white">{user?.email}</p>
        </div>

        <LogoutButton />
      </div>
    </div>
  );
}
