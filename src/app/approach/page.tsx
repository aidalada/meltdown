import { copy } from "@/content/copy";
import { TECHNIQUES } from "@/lib/data";
import { signed } from "@/components/TagChip";

export const metadata = { title: `${copy.approach.title} — ${copy.brand.name}` };

export default function ApproachPage() {
  return (
    <div className="wrap wrap-narrow">
      <div className="pt-7 pb-5"><h1 className="text-[clamp(28px,4.6vw,40px)]">{copy.approach.title}</h1></div>
      <div className="grid max-w-[68ch] gap-3">
        <h2 className="mt-2 text-[22px]">{copy.approach.howTitle}</h2>
        <p>{copy.approach.howBody}</p>
        <h2 className="mt-4 text-[22px]">{copy.approach.techniquesTitle}</h2>
      </div>
      <div className="mt-3 grid gap-2.5">
        {TECHNIQUES.map((t) => (
          <div key={t.tag} className="card grid gap-1 px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-sans text-base font-semibold">{t.label}</h3>
              <span className={`tag-chip ${t.weight > 0 ? "tag-chip-pos" : "tag-chip-neg"}`}>{signed(t.weight)}</span>
            </div>
            <p className="text-[15px] text-muted">{t.why}</p>
            <a className="text-[13px]" href={t.source.url} target="_blank" rel="noopener noreferrer">{copy.debrief.source}: {t.source.name}</a>
          </div>
        ))}
      </div>
      <div className="mt-2 grid max-w-[68ch] gap-3">
        <h2 className="mt-4 text-[22px]">{copy.approach.notTitle}</h2>
        <p>{copy.disclaimer.full}</p>
        <h2 className="mt-4 text-[22px]">{copy.approach.helpTitle}</h2>
        <p>{copy.safety.childBody}</p>
        <p>{copy.safety.parentBody}</p>
        <h2 className="mt-4 text-[22px]">{copy.approach.privacyTitle}</h2>
        <p>{copy.approach.privacyBody}</p>
      </div>
    </div>
  );
}
