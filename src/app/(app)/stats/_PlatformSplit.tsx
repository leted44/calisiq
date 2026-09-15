import {
  PLATFORM_LABELS,
  BROWSER_LABELS,
  type Platform,
  type Browser,
} from "@/lib/device";

/**
 * Activation par plateforme et par navigateur.
 *
 * POURQUOI UN CROISEMENT ET NON UN DÉCOMPTE
 *
 * Savoir que soixante pour cent des inscrits sont sur iPhone ne dit rien : ça
 * décrit le marché, pas l'application. Ce qui parle, c'est l'écart entre
 * « arrivés » et « ont analysé » d'une plateforme à l'autre. Si tout le monde
 * analyse sauf les iPhone, ce n'est pas une préférence d'usage, c'est un bug.
 *
 * La barre est donc un taux d'activation, pas une part de marché, et les
 * lignes sont classées par nombre d'inscrits pour qu'on voie d'abord celles
 * où l'écart compte.
 *
 * LES NAVIGATEURS INTÉGRÉS
 *
 * Instagram, TikTok et Facebook ouvrent les liens dans leur propre navigateur,
 * qui bride l'accès aux fichiers et à la caméra et ne sait pas installer
 * l'application. Ils sont donc listés à part de Chrome et de Safari, dont ils
 * empruntent pourtant la signature : les confondre effacerait exactement
 * l'information qu'on cherche.
 */

export type PlatformRow = { key: string; users: number; active: number };

// Le rouge n'est pas décoratif : sous la moitié, la plateforme est suspecte et
// mérite qu'on aille regarder, pas qu'on l'admire.
function couleurTaux(taux: number): string {
  if (taux >= 0.6) return "#4ade80";
  if (taux >= 0.3) return "#fbbf24";
  return "#f87171";
}

function Bloc({
  titre,
  lignes,
  libelle,
}: {
  titre: string;
  lignes: PlatformRow[];
  libelle: (cle: string) => string;
}) {
  if (lignes.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="mb-3 text-[11px] uppercase tracking-wide text-slate-500">
        {titre}
      </p>

      <ul className="space-y-2.5">
        {lignes.map((ligne) => {
          const taux = ligne.users > 0 ? ligne.active / ligne.users : 0;
          const couleur = couleurTaux(taux);
          return (
            <li key={ligne.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-slate-300">
                  {libelle(ligne.key)}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  <span style={{ color: couleur }}>{ligne.active}</span>/
                  {ligne.users}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, Math.round(taux * 100))}%`,
                    backgroundColor: couleur,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PlatformSplit({
  platforms,
  browsers,
}: {
  platforms: PlatformRow[];
  browsers: PlatformRow[];
}) {
  return (
    <div className="space-y-3">
      <Bloc
        titre="Activation par plateforme"
        lignes={platforms}
        libelle={(cle) =>
          cle === "unknown"
            ? "Non renseigné"
            : PLATFORM_LABELS[cle as Platform] ?? cle
        }
      />
      <Bloc
        titre="Activation par navigateur"
        lignes={browsers}
        libelle={(cle) =>
          cle === "unknown"
            ? "Non renseigné"
            : BROWSER_LABELS[cle as Browser] ?? cle
        }
      />
      <p className="text-[11px] leading-relaxed text-slate-500">
        Le chiffre coloré est le nombre de comptes ayant lancé au moins une
        analyse, sur le nombre arrivés depuis cette plateforme. C&apos;est
        l&apos;écart entre les lignes qui compte, pas leur taille : si une seule
        décroche, c&apos;est un bug, pas une préférence.
      </p>
    </div>
  );
}
