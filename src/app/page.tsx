import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  UploadCloudIcon,
  BodyIcon,
  TrendUpIcon,
  AngleWarningIcon,
  TimerIcon,
  CheckIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  // Sans `metadataBase`, l'image d'aperçu Open Graph reste une adresse
  // relative : Instagram, TikTok et WhatsApp ne savent pas la résoudre et
  // affichent un lien nu. C'est précisément le lien qu'on partage partout.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://calisiq.vercel.app"
  ),
  title: "CalisIQ — Analyse ta technique en calisthénie",
  description:
    "Filme ta planche, ton front lever ou ton handstand : CalisIQ mesure tes angles articulaires, note chaque critère et te dit exactement quoi corriger.",
  openGraph: {
    title: "CalisIQ — Analyse ta technique en calisthénie",
    description:
      "Une note sur 10 par critère technique, mesurée sur tes vraies articulations. Pas un avis, une mesure.",
    images: ["/logo-full.webp"],
  },
};

const STEPS = [
  {
    Icon: UploadCloudIcon,
    title: "Filme ou importe",
    text: "Deux ou trois secondes de hold suffisent, corps entier dans le cadre.",
  },
  {
    Icon: BodyIcon,
    title: "L'analyse tourne sur ton téléphone",
    text: "33 points du corps sont suivis image par image, et chaque angle articulaire est mesuré.",
  },
  {
    Icon: AngleWarningIcon,
    title: "Tu vois où ça coince",
    text: "Une note par critère, ton point faible désigné, et les exercices pour le corriger.",
  },
];

const FIGURES = [
  {
    name: "Planche",
    tagline: "Poussée horizontale",
    image: "/figures/planche.png",
    variations: "Tuck, advanced tuck, straddle, full",
  },
  {
    name: "Front Lever",
    tagline: "Traction horizontale",
    image: "/figures/full-front-lever.png",
    variations: "Tuck, advanced tuck, single leg, straddle, full",
  },
  {
    name: "Handstand",
    tagline: "Équilibre inversé",
    image: "/figures/handstand.png",
    variations: "Équilibre tenu",
  },
];

const FEATURES = [
  {
    Icon: AngleWarningIcon,
    title: "Une note par critère, pas une note globale",
    text: "Coudes, hanches, genoux, ligne de corps, protraction des épaules. Un score de 7,4 ne t'apprend rien ; savoir que ce sont tes hanches qui coûtent 2 points, si.",
  },
  {
    Icon: TrendUpIcon,
    title: "La progression se voit",
    text: "Chaque analyse enregistrée alimente une courbe par figure, et un comparatif avant/après avec ta vidéo de référence.",
  },
  {
    Icon: TimerIcon,
    title: "La vidéo annotée, prête à publier",
    text: "Squelette superposé, scores en direct, ralenti sur ton point faible avec le fantôme de la position idéale. Exportée dans la qualité d'origine.",
  },
];

const FAQ = [
  {
    question: "C'est gratuit ?",
    answer:
      "Oui. L'analyse et l'export vidéo sont gratuits, et le resteront. Ce qui deviendra payant plus tard, c'est le retrait du filigrane et la conservation illimitée des vidéos.",
  },
  {
    question: "Mes vidéos partent sur un serveur ?",
    answer:
      "Non, pas par défaut. L'analyse tourne entièrement dans ton navigateur : ta vidéo ne quitte pas ton téléphone. Elle n'est envoyée que si tu choisis explicitement de garder la figure dans ton historique.",
  },
  {
    question: "Il me faut du matériel ?",
    answer:
      "Un téléphone et de quoi te filmer de profil, corps entier visible. C'est tout. Pas de capteur, pas d'application à installer sur un ordinateur.",
  },
  {
    question: "Sur quoi reposent les notes ?",
    answer:
      "Sur des seuils d'angles calibrés à partir de figures réelles notées une par une, et affinés à mesure que les échantillons s'accumulent. Chaque critère indique s'il est calibré ou encore approximatif.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Un utilisateur déjà connecté n'a rien à faire sur la page de présentation.
  // C'est ce qui permet de garder une seule adresse à communiquer : elle
  // présente le produit aux visiteurs et ouvre l'app pour les autres.
  if (user) redirect("/analyser");

  return (
    <main className="min-h-screen bg-slate-950">
      {/* --- Hero --- */}
      <section className="relative overflow-hidden px-5 pb-14 pt-12">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-full.webp"
            alt="CalisIQ"
            className="w-full max-w-[300px] mix-blend-screen"
          />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
            Analyse Intelligente de la Forme
          </p>

          <h1 className="mt-7 text-[27px] font-bold leading-[1.15] text-white">
            Ta planche est-elle vraiment horizontale&nbsp;?
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            Filme ton hold. CalisIQ mesure tes angles articulaires réels, note
            chaque critère technique sur 10 et te désigne celui qui te coûte le
            plus de points.
          </p>

          <Link
            href="/login"
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-center text-[15px] font-semibold text-white shadow-lg shadow-cyan-500/20"
          >
            Analyser ma première figure
          </Link>
          <p className="mt-2.5 text-xs text-slate-500">
            Gratuit, sans installation. Ton email suffit.
          </p>
        </div>
      </section>

      {/* --- Ce que ça donne --- */}
      <section className="border-t border-slate-900 px-5 py-14">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Le résultat
          </p>
          <h2 className="mt-2 text-[22px] font-bold leading-tight text-white">
            Un avis, ça se discute. Une mesure, non.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            Chaque articulation est suivie image par image pendant ton hold. Le
            score ne vient pas d&apos;une impression, mais de l&apos;angle réel
            de tes coudes, de tes hanches et de ta ligne de corps, comparé aux
            seuils de la figure que tu travailles.
          </p>

          <div className="relative mt-7 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-emblem.webp"
              alt="Squelette superposé sur une planche, avec le score par critère"
              className="w-full mix-blend-screen"
            />
          </div>
          <p className="mt-2.5 text-center text-xs text-slate-500">
            Points articulaires suivis, score global et critères validés ou à
            corriger.
          </p>
        </div>
      </section>

      {/* --- Les 3 étapes --- */}
      <section className="border-t border-slate-900 px-5 py-14">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            En trois gestes
          </p>
          <div className="mt-5 space-y-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
                  <step.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    <span className="text-cyan-400">{index + 1}.</span>{" "}
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Figures couvertes --- */}
      <section className="border-t border-slate-900 px-5 py-14">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Figures analysées
          </p>
          <h2 className="mt-2 text-[22px] font-bold leading-tight text-white">
            Trois figures, dix variations
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            Chaque variation a ses propres seuils. Une tuck planche n&apos;est
            pas notée sur les mêmes critères qu&apos;une full, et soumettre
            l&apos;une à la place de l&apos;autre se voit dans le score.
          </p>

          <div className="mt-6 space-y-3">
            {FIGURES.map((figure) => (
              <div
                key={figure.name}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
              >
                <div className="h-40 w-full px-3 pt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={figure.image}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2.5 px-4 pb-4 pt-1">
                  <span
                    aria-hidden
                    className="h-7 w-[3px] shrink-0 rounded-full bg-cyan-400"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight text-white">
                      {figure.name}
                    </p>
                    <p className="text-[11px] leading-tight text-cyan-300/80">
                      {figure.tagline}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {figure.variations}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Ce que tu obtiens --- */}
      <section className="border-t border-slate-900 px-5 py-14">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ce que tu obtiens
          </p>
          <div className="mt-5 space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <div className="flex items-center gap-2.5">
                  <feature.Icon className="h-5 w-5 shrink-0 text-cyan-400" />
                  <p className="font-semibold text-white">{feature.title}</p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="border-t border-slate-900 px-5 py-14">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Questions
          </p>
          <div className="mt-5 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
            {FAQ.map((item) => (
              <div key={item.question} className="p-4">
                <p className="flex items-start gap-2 font-medium text-white">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  {item.question}
                </p>
                <p className="mt-1.5 pl-6 text-sm leading-relaxed text-slate-400">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA final --- */}
      <section className="relative overflow-hidden border-t border-slate-900 px-5 py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-md text-center">
          <h2 className="text-[22px] font-bold leading-tight text-white">
            Arrête de deviner si ta forme est bonne
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            Une vidéo de trois secondes, et tu sais quel critère travailler
            cette semaine.
          </p>
          <Link
            href="/login"
            className="mt-7 block w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-cyan-500/20"
          >
            Commencer gratuitement
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-900 px-5 py-8">
        <div className="mx-auto flex max-w-md items-center justify-between text-xs text-slate-600">
          <span>CalisIQ</span>
          <Link
            href="/confidentialite"
            className="text-slate-500 hover:text-slate-400"
          >
            Confidentialité
          </Link>
        </div>
      </footer>
    </main>
  );
}
