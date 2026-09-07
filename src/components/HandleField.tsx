"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { normalizeHandle, handleProblem } from "@/lib/profile/handle";
import { CheckIcon } from "@/components/icons";

/** Résultat d'une vérification, attaché au pseudo qu'elle concerne. */
type Check = { handle: string; result: "available" | "taken" | "error" };

// Champ de pseudo public, partagé entre l'inscription et le profil.
//
// Un seul composant pour les deux, parce que la disponibilité, la
// normalisation et les messages doivent être identiques des deux côtés. Un
// pseudo accepté à l'inscription et refusé au profil serait incompréhensible.
//
// L'ÉTAT PORTE LE PSEUDO VÉRIFIÉ, PAS UN STATUT
//
// Ranger un simple « en cours / disponible / pris » obligerait à le remettre
// à zéro à chaque frappe, donc à écrire l'état pendant le rendu — ce que React
// interdit à juste titre, puisque ça déclenche des rendus en cascade. En
// mémorisant à QUEL pseudo se rapporte la réponse, tout le reste se déduit :
// une réponse qui ne concerne pas la saisie courante est simplement périmée.
export default function HandleField({
  value,
  onChange,
  onAvailable,
}: {
  value: string;
  onChange: (next: string) => void;
  /**
   * Pseudo confirmé libre. Le parent compare avec sa propre valeur pour
   * savoir s'il peut soumettre : une confirmation qui ne correspond plus à ce
   * qui est tapé ne vaut rien.
   */
  onAvailable?: (handle: string) => void;
}) {
  const t = useT();
  const [check, setCheck] = useState<Check | null>(null);
  const probleme = handleProblem(value);

  useEffect(() => {
    if (probleme !== null) return;

    // Attente avant d'interroger le serveur : sans elle, chaque frappe
    // déclencherait une requête. Le drapeau d'annulation écarte une réponse
    // devenue périmée parce que l'utilisateur a continué de taper.
    let annule = false;
    const minuteur = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("handle_available", {
        candidate: value,
      });
      if (annule) return;
      if (error) {
        setCheck({ handle: value, result: "error" });
        return;
      }
      const libre = data === true;
      setCheck({ handle: value, result: libre ? "available" : "taken" });
      if (libre) onAvailable?.(value);
    }, 400);

    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
    // onAvailable est hors des dépendances : le parent la recrée à chaque
    // rendu, et l'inclure relancerait la vérification en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, probleme]);

  // Une réponse ne vaut que pour le pseudo qu'elle a testé.
  const resultat = check?.handle === value ? check.result : null;
  const enCours = probleme === null && resultat === null;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="handle"
        className="text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {t.handle.label}
      </label>

      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 focus-within:border-cyan-500">
        {/* Le préfixe explique le champ mieux qu'une phrase : on voit une
            adresse se construire en tapant. */}
        <span className="shrink-0 font-mono text-sm text-slate-500">
          {t.handle.prefix}
        </span>
        <input
          id="handle"
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(normalizeHandle(e.target.value))}
          placeholder={t.handle.placeholder}
          className="w-full bg-transparent py-2.5 font-mono text-sm text-white placeholder-slate-600 outline-none"
        />
        {resultat === "available" && (
          <CheckIcon className="h-4 w-4 shrink-0 text-green-400" />
        )}
      </div>

      <p
        className={`text-[11px] leading-relaxed ${
          resultat === "taken" || resultat === "error"
            ? "text-orange-400"
            : resultat === "available"
            ? "text-green-400"
            : "text-slate-500"
        }`}
      >
        {probleme === "tooShort"
          ? t.handle.tooShort
          : enCours
          ? t.handle.checking
          : resultat === "taken"
          ? t.handle.taken
          : resultat === "error"
          ? t.handle.checkFailed
          : resultat === "available"
          ? t.handle.available
          : t.handle.hint}
      </p>
    </div>
  );
}
