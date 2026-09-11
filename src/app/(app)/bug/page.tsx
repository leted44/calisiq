import { getDictionary } from "@/lib/i18n/server";
import BugReportForm from "./BugReportForm";

export default async function BugPage() {
  const t = await getDictionary();

  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-16 pt-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">{t.bug.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          {t.bug.intro}
        </p>
      </div>

      <div className="w-full max-w-md">
        <BugReportForm />
      </div>
    </div>
  );
}
