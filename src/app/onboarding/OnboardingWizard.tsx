"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Gender = "homme" | "femme" | "autre";

type InitialProfile = {
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  gender: Gender | null;
  avatarUrl: string | null;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const STEP_LABELS = ["Informations", "Mensurations", "Photo de profil"];

export default function OnboardingWizard({
  userId,
  userEmail,
  initialProfile,
}: {
  userId: string;
  userEmail: string;
  initialProfile: InitialProfile;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [birthDate, setBirthDate] = useState(initialProfile.birthDate ?? "");
  const [gender, setGender] = useState<Gender | null>(initialProfile.gender);
  const [heightCm, setHeightCm] = useState(
    initialProfile.heightCm !== null ? String(initialProfile.heightCm) : ""
  );
  const [weightKg, setWeightKg] = useState(
    initialProfile.weightKg !== null ? String(initialProfile.weightKg) : ""
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialProfile.avatarUrl
  );
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = userEmail.slice(0, 2).toUpperCase();

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_AVATAR_BYTES) {
      setAvatarError(
        `Cette image est trop lourde (${(selected.size / (1024 * 1024)).toFixed(1)} Mo, maximum 2 Mo).`
      );
      return;
    }

    setAvatarError(null);
    setAvatarFile(selected);
    setAvatarPreview(URL.createObjectURL(selected));
  }

  async function finish() {
    setSaving(true);
    setError(null);

    let avatarUrl = initialProfile.avatarUrl;

    if (avatarFile) {
      const extension = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        setError("La photo n'a pas pu être envoyée : " + uploadError.message);
        setSaving(false);
        return;
      }

      avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        birth_date: birthDate || null,
        gender,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError("Enregistrement impossible : " + updateError.message);
      return;
    }

    router.push("/analyser");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/40">
      {/* L'emblème seul, sans le mot-logo : la marque vient d'être vue en
          grand sur l'écran de connexion, la répéter entière juste après
          ferait redite. */}
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-emblem.webp"
          alt=""
          className="h-20 w-auto mix-blend-screen"
        />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Bienvenue
        </p>
        <h1 className="text-xl font-semibold text-white">Configure ton profil</h1>
      </div>

      <div className="flex gap-1.5">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-slate-800"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Informations personnelles</h2>
          <p className="text-sm text-slate-400">
            Facultatif — utilisé pour affiner les repères de progression.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Date de naissance
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Sexe
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["homme", "femme", "autre"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(gender === g ? null : g)}
                  className={`rounded-lg border py-2.5 text-sm font-medium capitalize transition-colors ${
                    gender === g
                      ? "border-cyan-500 bg-cyan-500/10 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Tes mensurations</h2>
          <p className="text-sm text-slate-400">
            Facultatif — utilisé pour affiner les repères de progression.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Taille (cm)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={250}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="Ex. 178"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Poids (kg)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={300}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ex. 72"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Photo de profil</h2>
          <p className="text-sm text-slate-400">
            Facultatif — tu peux passer cette étape.
          </p>

          <div className="flex flex-col items-center gap-3">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Photo de profil"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 text-lg font-semibold text-white">
                {initials}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-600"
            >
              Choisir une photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-slate-500">
              JPG, PNG, WebP ou GIF — max 2 Mo
            </p>
            {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)]"
          >
            Suivant
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 font-medium text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Terminer"}
          </button>
        )}

        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-sm text-slate-400 hover:text-slate-300"
            >
              Retour
            </button>
          ) : (
            <span />
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-300"
            >
              Passer cette étape
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-300 disabled:opacity-50"
            >
              Passer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
