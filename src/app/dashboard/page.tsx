import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-sm text-slate-500">Connecté en tant que</p>
          <p className="font-medium text-white">{user.email}</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/upload"
            className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-sky-600"
          >
            <p className="font-semibold text-white">Uploader un hold</p>
            <p className="text-sm text-slate-400">
              Analyse ta pose et obtiens ton score
            </p>
          </Link>

          <Link
            href="/pose-poc"
            className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-sky-600"
          >
            <p className="font-semibold text-white">POC MediaPipe</p>
            <p className="text-sm text-slate-400">
              Squelette en direct via la webcam
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
