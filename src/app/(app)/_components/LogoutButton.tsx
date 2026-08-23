"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutIcon } from "@/components/icons";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/50 bg-red-500/10 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50"
    >
      <LogoutIcon className="h-4 w-4" />
      {loading ? "Déconnexion..." : "Se déconnecter"}
    </button>
  );
}
