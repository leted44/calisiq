"use client";

import { useT } from "@/lib/i18n/client";

/**
 * Bêta, et gratuit tant qu'elle dure.
 *
 * POURQUOI SUR LA PAGE PUBLIQUE, ET PAS DANS L'APPLICATION
 *
 * Ce sont deux lecteurs différents. Celui qui découvre le produit se demande
 * ce qu'il va coûter : lui répondre lève un frein, et une gratuité rattachée
 * à une phase donne une raison de s'inscrire maintenant plutôt qu'un jour.
 * Celui qui est déjà inscrit ouvre l'application pour s'entraîner ; lui
 * rappeler chaque matin que ce sera peut-être payant n'apporte rien et sème
 * un doute. Il n'a droit qu'à la pastille [[BetaBadge]], qui dit l'état sans
 * poser de question d'argent.
 *
 * D'où aussi la formulation : « pendant la bêta » et non « pour l'instant ».
 * La première rattache la gratuité à une étape du produit, la seconde annonce
 * un compte à rebours avant facture.
 */
export default function BetaFreeNotice() {
  const t = useT();

  return (
    <div className="rounded-xl border border-amber-500/15 px-3.5 py-2.5">
      <p className="text-[12px] font-semibold text-amber-200/90">
        {t.beta.freeTitle}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
        {t.beta.freeBody}
      </p>
    </div>
  );
}
