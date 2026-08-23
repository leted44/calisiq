import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Progression } from "@/lib/pose/grid";
import UploadForm from "./UploadForm";
import VideoPoseOverlay from "./VideoPoseOverlay";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, progression, status, video_url, created_at")
    .order("created_at", { ascending: false });

  const sessionsWithUrls = await Promise.all(
    (sessions ?? []).map(async (session) => {
      const { data } = await supabase.storage
        .from("videos")
        .createSignedUrl(session.video_url, 3600);
      return { ...session, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 p-8">
      <UploadForm />

      <div className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Mes holds</h2>

        {sessionsWithUrls.length === 0 && (
          <p className="text-sm text-gray-500">Aucun upload pour l&apos;instant.</p>
        )}

        {sessionsWithUrls.map((session) => (
          <div key={session.id} className="rounded-lg bg-white p-4 shadow">
            <p className="mb-2 text-sm text-gray-700">
              {session.progression} — {session.status}
            </p>
            {session.signedUrl && (
              <VideoPoseOverlay
                videoUrl={session.signedUrl}
                sessionId={session.id}
                progression={session.progression as Progression}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
