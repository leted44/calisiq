import { ProfileIcon, BodyIcon } from "@/components/icons";

/**
 * Qui s'est inscrit, ligne par ligne.
 *
 * POURQUOI DES PERSONNES ET PAS DES MOYENNES
 *
 * Le reste de la page donne des totaux et des pourcentages, ce qui est la
 * bonne façon de lire mille utilisateurs et la mauvaise d'en lire quatre.
 * « 50 % ont analysé » ne dit rien d'actionnable ; « cette adresse-là s'est
 * inscrite il y a six jours et n'a jamais rien analysé » se traite par un
 * message. À ce stade, ce sont les personnes qui comptent, pas la courbe.
 *
 * D'où le classement : les comptes inactifs remontent en tête, puisque ce
 * sont eux sur lesquels il y a quelque chose à faire.
 */

export type AdminUser = {
  id: string;
  email: string;
  handle: string | null;
  country: string | null;
  created_at: string;
  onboarding_completed: boolean;
  sessions_done: number;
  figures: number;
  last_session_at: string | null;
};

const jourCourt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

function ilYA(iso: string): string {
  const jours = Math.round(
    (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} j`;
  return jourCourt.format(new Date(iso));
}

// Deux lettres de code pays en drapeau. Les indicatifs régionaux Unicode
// occupent un bloc à part : décaler chaque lettre de A vers ce bloc suffit,
// aucune table de correspondance n'est nécessaire.
function drapeau(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export default function UsersList({ users }: { users: AdminUser[] }) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        Aucun inscrit pour l&apos;instant.
      </div>
    );
  }

  // Les inactifs d'abord, puis les plus récents : l'ordre suit ce qu'il y a à
  // faire, pas la chronologie.
  const ordonnes = [...users].sort((a, b) => {
    if ((a.sessions_done === 0) !== (b.sessions_done === 0)) {
      return a.sessions_done === 0 ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const inactifs = users.filter((u) => u.sessions_done === 0).length;

  return (
    <div className="space-y-2">
      {inactifs > 0 && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-300/80">
          {inactifs === 1
            ? "1 compte créé n'a jamais lancé d'analyse."
            : `${inactifs} comptes créés n'ont jamais lancé d'analyse.`}{" "}
          C&apos;est le seul chiffre sur lequel tu peux agir directement.
        </p>
      )}

      <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        {ordonnes.map((u) => {
          const actif = u.sessions_done > 0;
          return (
            <li key={u.id} className="flex items-center gap-3 px-3.5 py-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  actif
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "bg-slate-800 text-slate-600"
                }`}
              >
                {actif ? (
                  <BodyIcon className="h-4 w-4" />
                ) : (
                  <ProfileIcon className="h-4 w-4" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white">
                  {u.country && <span className="mr-1">{drapeau(u.country)}</span>}
                  {u.email}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {u.handle ? `@${u.handle} · ` : ""}
                  inscrit {ilYA(u.created_at)}
                  {!u.onboarding_completed && " · profil non terminé"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                {actif ? (
                  <>
                    <p className="font-mono text-[13px] font-bold tabular-nums text-cyan-400">
                      {u.sessions_done}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {u.figures} fig. · {u.last_session_at ? ilYA(u.last_session_at) : "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">
                    jamais
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
