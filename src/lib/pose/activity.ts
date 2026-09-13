import { levelPoints } from "./level";
import { ladderFamily } from "./ladder";

/**
 * Ce que l'historique des séances dit de l'activité, par opposition au niveau.
 *
 * POURQUOI SÉPARER LES DEUX
 *
 * Le niveau répond à « où j'en suis » et ne bouge que si une figure est mieux
 * exécutée qu'avant. L'activité répond à « est-ce que je m'entraîne », et elle
 * bouge chaque fois qu'on ouvre l'application. Ce sont deux motivations
 * distinctes : la première récompense la performance, rare par nature, la
 * seconde la régularité, qui est la seule chose sur laquelle on ait prise tous
 * les jours.
 *
 * Tout se calcule à partir des séances déjà chargées : aucune requête
 * supplémentaire, aucune colonne nouvelle. Ce qui ne s'en déduit pas — durée
 * réelle d'entraînement, temps de récupération, volume de séries — n'est pas
 * inventé ici. Une statistique fabriquée décrédibilise les vraies.
 */

export type SeanceBrute = {
  variation: string;
  date: string;
  score: number;
  holdDuration: number | null;
};

/** Jour civil d'une date ISO, au format AAAA-MM-JJ. */
function jour(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function jourDeDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Nombre de jours consécutifs, en remontant, où au moins une analyse a été
 * faite.
 *
 * La veille compte comme point de départ autant qu'aujourd'hui : quelqu'un qui
 * s'est entraîné hier et ouvre l'application ce matin n'a pas rompu sa série,
 * il n'a simplement pas encore fait sa séance du jour. Casser le compteur à
 * midi serait faux et décourageant.
 */
export function serieEnCours(dates: string[], maintenant = new Date()): number {
  if (dates.length === 0) return 0;

  const jours = new Set(dates.map(jour));
  const curseur = new Date(maintenant);

  // Point de départ : aujourd'hui s'il compte, sinon hier, sinon la série est
  // rompue.
  if (!jours.has(jourDeDate(curseur))) {
    curseur.setUTCDate(curseur.getUTCDate() - 1);
    if (!jours.has(jourDeDate(curseur))) return 0;
  }

  let compte = 0;
  while (jours.has(jourDeDate(curseur))) {
    compte += 1;
    curseur.setUTCDate(curseur.getUTCDate() - 1);
  }
  return compte;
}

/** Début du lundi de la semaine en cours, en temps universel. */
export function debutDeSemaine(maintenant = new Date()): Date {
  const d = new Date(maintenant);
  // getUTCDay() vaut 0 le dimanche : ramené à 6 pour que la semaine commence
  // un lundi, comme partout en Europe.
  const decalage = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - decalage);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export type PointHebdo = { label: string; points: number };

/**
 * Le total de points semaine par semaine, sur les douze dernières.
 *
 * CUMULATIF, PAS PAR SEMAINE
 *
 * Chaque point est le total qu'on aurait affiché à la fin de cette semaine-là,
 * c'est-à-dire la somme des meilleurs résultats connus à ce moment. La courbe
 * ne peut donc que monter ou rester plate, jamais descendre — ce qui est la
 * vérité du niveau : une figure prouvée reste prouvée. Une courbe de points
 * gagnés par semaine, elle, retomberait à zéro à la moindre semaine de repos
 * et donnerait l'impression d'avoir régressé.
 */
export function courbeHebdomadaire(
  seances: SeanceBrute[],
  semaines = 12,
  maintenant = new Date()
): PointHebdo[] {
  const finSemaineCourante = debutDeSemaine(maintenant);
  finSemaineCourante.setUTCDate(finSemaineCourante.getUTCDate() + 7);

  const sortie: PointHebdo[] = [];
  for (let i = semaines - 1; i >= 0; i--) {
    const fin = new Date(finSemaineCourante);
    fin.setUTCDate(fin.getUTCDate() - i * 7);

    const meilleurs = new Map<string, number>();
    for (const s of seances) {
      if (new Date(s.date) >= fin) continue;
      const points = levelPoints(s.variation, s.score, s.holdDuration);
      if (points > (meilleurs.get(s.variation) ?? 0)) {
        meilleurs.set(s.variation, points);
      }
    }

    sortie.push({
      label: `S${semaines - i}`,
      points: [...meilleurs.values()].reduce((somme, p) => somme + p, 0),
    });
  }
  return sortie;
}

export type Part = {
  family: string;
  count: number;
  share: number;
};

/** Nombre de séances par figure, de la plus travaillée à la moins. */
export function repartitionParFigure(seances: SeanceBrute[]): Part[] {
  const parFamille = new Map<string, number>();
  for (const s of seances) {
    const cle = ladderFamily(s.variation);
    parFamille.set(cle, (parFamille.get(cle) ?? 0) + 1);
  }

  const total = seances.length;
  return [...parFamille.entries()]
    .map(([family, count]) => ({
      family,
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Couleur de chaque figure, tenue à part des couleurs de palier.
 *
 * Les deux ne disent pas la même chose et ne doivent pas se ressembler : la
 * couleur de palier dit un niveau atteint, celle-ci ne fait que distinguer
 * une figure d'une autre dans un graphique.
 *
 * L'ORDRE DES TEINTES N'EST PAS LIBRE
 *
 * La première version donnait du cyan à la planche et du bleu au handstand,
 * deux teintes voisines. Or ce sont les deux figures les plus travaillées :
 * l'anneau les montrait côte à côte et paraissait monochrome, exactement le
 * défaut qu'un camembert doit éviter.
 *
 * Les couleurs sont donc attribuées dans l'ordre de popularité des figures,
 * en sautant à chaque fois à l'opposé du cercle chromatique. Les deux
 * premières — cyan et ambre — sont complémentaires, donc aussi éloignées que
 * deux couleurs peuvent l'être ; les suivantes s'intercalent. Une part de
 * quelques pixels reste ainsi identifiable sans lire la légende.
 *
 * Saturations élevées assumées : sur un fond presque noir, une teinte pastel
 * perd la moitié de sa présence et l'ensemble devient terne.
 */
export const FIGURE_COLORS: Record<string, string> = {
  planche: "#22d3ee",
  handstand: "#f59e0b",
  front_lever: "#22c55e",
  human_flag: "#a855f7",
  dragon_flag: "#ec4899",
  traction: "#3b82f6",
  dips: "#f43f5e",
  pompes: "#eab308",
  pistol: "#a3e635",
};
