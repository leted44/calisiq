"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TrashIcon } from "@/components/icons";

// Mot à recopier pour confirmer. La suppression est définitive et efface aussi
// les vidéos : un simple « es-tu sûr ? » se clique par réflexe, recopier un mot
// demande de lire ce qui est écrit.
const CONFIRMATION_WORD = "SUPPRIMER";

export default function DeleteAccountButton() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = typed.trim().toUpperCase() === CONFIRMATION_WORD;

  // Vide les fichiers de l'utilisateur dans un bucket. Les chemins sont plats,
  // de la forme `{userId}/fichier`, un seul listage suffit donc.
  async function purgeBucket(bucket: string, userId: string) {
    const { data: files } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 1000 });
    if (!files || files.length === 0) return;
    await supabase.storage
      .from(bucket)
      .remove(files.map((file) => `${userId}/${file.name}`));
  }

  async function handleDelete() {
    if (!confirmed || loading) return;
    setLoading(true);
    setError(null);

    // Les vidéos et l'avatar partent en premier, et depuis le navigateur.
    // Supabase interdit le `delete` direct sur `storage.objects`, y compris
    // à une fonction `security definer` : seule l'API de stockage y a droit.
    // On le fait donc avant, tant que la session est encore valide — après la
    // suppression du compte, plus aucun appel authentifié ne passerait.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await Promise.all([
        purgeBucket("videos", user.id),
        purgeBucket("avatars", user.id),
      ]);
    }

    const { error: rpcError } = await supabase.rpc("delete_own_account");

    if (rpcError) {
      setLoading(false);
      setError("Suppression impossible : " + rpcError.message);
      return;
    }

    // Le compte n'existe plus, la session en cours ne vaut donc plus rien.
    // On la ferme explicitement pour vider le cookie avant de repartir sur
    // l'écran de connexion.
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-red-400"
      >
        <TrashIcon className="h-4 w-4" />
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-red-900/60 bg-red-500/5 p-4">
      <div>
        <p className="text-sm font-semibold text-white">
          Supprimer définitivement ton compte
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Ton profil, tes analyses, tes scores et toutes tes vidéos seront
          effacés. Cette action est irréversible : rien n&apos;est conservé, et
          nous ne pourrons rien restaurer.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="delete-confirm"
          className="block text-xs text-slate-400"
        >
          Écris <span className="font-semibold text-slate-200">{CONFIRMATION_WORD}</span>{" "}
          pour confirmer
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder={CONFIRMATION_WORD}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-red-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
          disabled={loading}
          className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!confirmed || loading}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-red-900/40 disabled:text-red-300/50"
        >
          {loading ? "Suppression..." : "Supprimer"}
        </button>
      </div>
    </div>
  );
}
