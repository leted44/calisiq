"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PROGRESSIONS = [
  { value: "tuck_planche", label: "Tuck planche" },
  { value: "advanced_tuck_planche", label: "Advanced tuck planche" },
  { value: "straddle_planche", label: "Straddle planche" },
  { value: "full_planche", label: "Full planche" },
];

export default function UploadForm() {
  const router = useRouter();
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);

  const [progression, setProgression] = useState(PROGRESSIONS[0].value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fileInput = e.currentTarget.elements.namedItem(
      "video"
    ) as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choisis une vidéo.");
      return;
    }

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expirée, reconnecte-toi.");
      setUploading(false);
      return;
    }

    const extension = file.name.split(".").pop() ?? "mp4";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("sessions").insert({
      user_id: user.id,
      video_url: path,
      progression,
      status: "processing",
    });

    setUploading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Uploader un hold
      </h2>

      <select
        value={progression}
        onChange={(e) => setProgression(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2"
      >
        {PROGRESSIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <input
        type="file"
        name="video"
        accept="video/*"
        required
        className="w-full text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50"
      >
        {uploading ? "Envoi en cours..." : "Envoyer"}
      </button>
    </form>
  );
}
