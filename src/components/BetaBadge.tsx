"use client";

import { useT } from "@/lib/i18n/client";

/**
 * Pastille « Bêta ».
 *
 * Annoncer que l'app est en construction n'est pas un aveu de faiblesse, c'est
 * ce qui transforme un bug rencontré en information attendue plutôt qu'en
 * déception. Quelqu'un qui sait où il met les pieds signale ; quelqu'un qui
 * croyait à un produit fini s'en va.
 *
 * Discrète par défaut : elle accompagne le nom du produit, elle ne le
 * concurrence pas.
 */
export default function BetaBadge({ className = "" }: { className?: string }) {
  const t = useT();

  return (
    <span
      className={`rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-300 ${className}`}
    >
      {t.beta.badge}
    </span>
  );
}
