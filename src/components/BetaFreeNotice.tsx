"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { StarIcon } from "@/components/icons";

/**
 * Bêta, et gratuit tant qu'elle dure.
 *
 * POURQUOI LE DIRE PLUTÔT QUE DE LE LAISSER DEVINER
 *
 * Une application qui ne demande rien inquiète autant qu'elle rassure : on se
 * demande quand viendra la facture, ou ce qu'on paye à la place. L'annoncer
 * franchement, avec sa raison — c'est une bêta —, retire la question et donne
 * à l'indulgence un motif. Quelqu'un qui sait qu'il essaie un produit en
 * construction signale un bug ; quelqu'un qui croyait payer pour un produit
 * fini s'en va.
 *
 * La pastille [[BetaBadge]] dit l'état, ce bloc dit ce que ça implique : les
 * deux ne se remplacent pas.
 */
export default function BetaFreeNotice({
  showReport = false,
}: {
  showReport?: boolean;
}) {
  const t = useT();

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-3">
      <div className="flex items-center gap-2">
        <StarIcon className="h-4 w-4 shrink-0 text-amber-300" />
        <p className="text-[13px] font-semibold text-amber-200">
          {t.beta.freeTitle}
        </p>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-amber-100/60">
        {t.beta.freeBody}
      </p>
      {showReport && (
        <Link
          href="/bug"
          className="mt-1.5 inline-block text-[12px] font-medium text-amber-300 underline underline-offset-2"
        >
          {t.beta.reportLink}
        </Link>
      )}
    </div>
  );
}
