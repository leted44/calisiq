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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <p className="text-gray-900">Connecté en tant que {user.email}</p>
      <div className="flex gap-4">
        <Link href="/upload" className="text-blue-600 underline">
          Uploader un hold
        </Link>
        <Link href="/pose-poc" className="text-blue-600 underline">
          POC MediaPipe
        </Link>
      </div>
    </div>
  );
}
