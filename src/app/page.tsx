import Link from "next/link";
import LanguagePicker from "./_components/LanguagePicker";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/fr";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
  // Sans `metadataBase`, l'image d'aperçu Open Graph reste une adresse
  // relative : Instagram, TikTok et WhatsApp ne savent pas la résoudre et
  // affichent un lien nu. C'est précisément le lien qu'on partage partout.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://calisiq.com"
  ),
  title: t.landing.metaTitle,
  description: t.landing.metaDescription,
  openGraph: {
    title: t.landing.metaTitle,
    description: t.landing.hero,
    images: ["/logo-full.webp"],
    },
  };
}

const STEPS = [
  {
    Icon: UploadCloudIcon,
    title: (t: Dictionary) => t.landing.step1,
    text: (t: Dictionary) => t.landing.step1Body,
  },
  {
    Icon: BodyIcon,
    title: (t: Dictionary) => t.landing.step2,
    text: (t: Dictionary) => t.landing.step2Body,
  },
  {
    Icon: AngleWarningIcon,
    title: (t: Dictionary) => t.landing.step3,
    text: (t: Dictionary) => t.landing.step3Body,
  },
];

const FIGURES = [
  {
    name: "Planche",
    tagline: (t: Dictionary) => t.figures.planche.tagline,
    image: "/figures/planche.png",
    variations: (t: Dictionary) => t.landing.plancheVariations,
  },
  {
    name: "Front Lever",
    tagline: (t: Dictionary) => t.figures.front_lever.tagline,
    image: "/figures/full-front-lever.png",
    variations: (t: Dictionary) => t.landing.frontLeverVariations,
  },
  {
    name: "Handstand",
    tagline: (t: Dictionary) => t.figures.handstand.tagline,
    image: "/figures/handstand.png",
    variations: (t: Dictionary) => t.landing.handstandVariations,
  },
];

const FEATURES = [
  {
    Icon: AngleWarningIcon,
    title: (t: Dictionary) => t.landing.get1,
    text: (t: Dictionary) => t.landing.get1Body,
  },
  {
    Icon: TrendUpIcon,
    title: (t: Dictionary) => t.landing.get2,
    text: (t: Dictionary) => t.landing.get2Body,
  },
  {
    Icon: TimerIcon,
    title: (t: Dictionary) => t.landing.get3,
    text: (t: Dictionary) => t.landing.get3Body,
  },
];

const FAQ = [
  {
    question: (t: Dictionary) => t.landing.q1,
    answer: (t: Dictionary) => t.landing.a1,
  },
  {
    question: (t: Dictionary) => t.landing.q2,
    answer: (t: Dictionary) => t.landing.a2,
  },
  {
    question: (t: Dictionary) => t.landing.q3,
    answer: (t: Dictionary) => t.landing.a3,
  },
  {
    question: (t: Dictionary) => t.landing.q4,
    answer: (t: Dictionary) => t.landing.a4,
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Repli du lien de réinitialisation de mot de passe.
  //
  // Supabase n'honore l'adresse de retour demandée que si elle figure dans sa
  // liste d'adresses autorisées, sinon il retombe sur l'adresse racine du site
  // en y accrochant quand même le code. Le lien de l'e-mail atterrissait donc
  // ici, sur la page de présentation, sans que rien ne se passe.
  //
  // Plutôt que de dépendre d'un réglage du tableau de bord, la page réexpédie
  // elle-même le code vers la route qui sait l'échanger. Un code qui arrive à
  // la racine ne peut venir que de là : la connexion Google vise directement
  // /auth/callback, et la confirmation d'inscription se fait désormais par
  // code saisi à la main, sans lien.
  const { code } = await searchParams;
  if (code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=/reset-password`
    );
  }

  const t = await getDictionary();
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
        {/* Au-dessus du logo et aligné à droite : présent sans disputer la
            place au message principal. */}
        <div className="relative mx-auto mb-2 flex max-w-md justify-end">
          <LanguagePicker />
        </div>
        <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-full.webp"
            alt="CalisIQ"
            className="w-full max-w-[300px] mix-blend-screen"
          />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
            {t.auth2.tagline}
          </p>

          <h1 className="mt-7 text-[27px] font-bold leading-[1.15] text-white">
            {t.landing.heroQuestion}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            {t.landing.heroBody}
          </p>

          <Link
            href="/login"
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-center text-[15px] font-semibold text-white shadow-lg shadow-cyan-500/20"
          >
            {t.landing.ctaFirst}
          </Link>
          <p className="mt-2.5 text-xs text-slate-500">
            {t.landing.heroFree}
          </p>
        </div>
      </section>

      {/* --- Ce que ça donne --- */}
      <section className="border-t border-slate-900 px-5 py-14">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t.landing.resultHeading}
          </p>
          <h2 className="mt-2 text-[22px] font-bold leading-tight text-white">
            {t.landing.heroPunch}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            {t.landing.resultBody}
          </p>

          <div className="relative mt-7 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-emblem.webp"
              alt={t.landing.resultAlt}
              className="w-full mix-blend-screen"
            />
          </div>
          <p className="mt-2.5 text-center text-xs text-slate-500">
            {t.landing.resultCaption}
          </p>
        </div>
      </section>

      {/* --- Les 3 étapes --- */}
      <section className="border-t border-slate-900 px-5 py-14">
        <div className="mx-auto max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t.landing.stepsHeading}
          </p>
          <div className="mt-5 space-y-3">
            {STEPS.map((step, index) => (
              <div
                key={step.title(t)}
                className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
                  <step.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    <span className="text-cyan-400">{index + 1}.</span>{" "}
                    {step.title(t)}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {step.text(t)}
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
            {t.landing.figuresHeading}
          </p>
          <h2 className="mt-2 text-[22px] font-bold leading-tight text-white">
            {t.landing.figuresTitle}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            {t.landing.figuresBody}
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
                      {figure.tagline(t)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {figure.variations(t)}
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
            {t.landing.getHeading}
          </p>
          <div className="mt-5 space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title(t)}>
                <div className="flex items-center gap-2.5">
                  <feature.Icon className="h-5 w-5 shrink-0 text-cyan-400" />
                  <p className="font-semibold text-white">{feature.title(t)}</p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {feature.text(t)}
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
            {t.landing.faqHeading}
          </p>
          <div className="mt-5 divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
            {FAQ.map((item) => (
              <div key={item.question(t)} className="p-4">
                <p className="flex items-start gap-2 font-medium text-white">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  {item.question(t)}
                </p>
                <p className="mt-1.5 pl-6 text-sm leading-relaxed text-slate-400">
                  {item.answer(t)}
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
            {t.landing.finalHeading}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
            {t.landing.finalBody}
          </p>
          <Link
            href="/login"
            className="mt-7 block w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-cyan-500/20"
          >
            {t.landing.ctaFinal}
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
            {t.landing.privacy}
          </Link>
        </div>
      </footer>
    </main>
  );
}
