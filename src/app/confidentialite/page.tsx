import { getDictionary } from "@/lib/i18n/server";

const CONTACT_EMAIL = "calisiq.app@gmail.com";

export default async function ConfidentialitePage() {
  const t = await getDictionary();

  // Sections énumérées plutôt qu'écrites une par une : elles ont toutes la
  // même forme, un titre et un paragraphe, et les lister évite de répéter
  // cinq fois le même balisage. Les deux premières restent écrites à la main
  // parce qu'elles portent respectivement un lien et une liste.
  const sections = [
    { title: t.privacy.whyTitle, body: t.privacy.whyBody },
    { title: t.privacy.hostingTitle, body: t.privacy.hostingBody },
    { title: t.privacy.googleTitle, body: t.privacy.googleBody },
    { title: t.privacy.rightsTitle, body: t.privacy.rightsBody },
    { title: t.privacy.cookiesTitle, body: t.privacy.cookiesBody },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-slate-950 px-4 py-12 text-slate-300">
      <div>
        <h1 className="text-2xl font-bold text-white">{t.privacy.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.privacy.updated}</p>
      </div>

      <p>{t.privacy.intro}</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          {t.privacy.publisherTitle}
        </h2>
        <p>
          {t.privacy.publisherBody}{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-cyan-400 underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">
          {t.privacy.dataTitle}
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.privacy.data1}</li>
          <li>{t.privacy.data2}</li>
          <li>{t.privacy.data3}</li>
          <li>{t.privacy.data4}</li>
        </ul>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-lg font-semibold text-white">{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
}
