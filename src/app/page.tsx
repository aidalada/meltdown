import Link from "next/link";
import { ChildAvatar } from "@/components/ChildAvatar";
import { MoodMeter } from "@/components/MoodMeter";
import { TagChip } from "@/components/TagChip";
import { TrackView } from "@/components/TrackView";
import { copy } from "@/content/copy";
import type { TechniqueTag } from "@/lib/types";

const MOVES: [TechniqueTag, number][] = [
  ["name_feeling", 12], ["offer_choice", 8], ["when_then", 6], ["threat", -15], ["yell_or_insult", -20],
];

export default function LandingPage() {
  return (
    <div className="wrap">
      <TrackView event="landing_view" />
      <section className="grid grid-cols-1 items-center gap-8 pt-8 pb-12 min-[900px]:grid-cols-[1.1fr_0.9fr] min-[900px]:gap-12 min-[900px]:pt-14 min-[900px]:pb-[72px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <p className="text-sm font-semibold text-muted">{copy.landing.kicker}</p>
          <h1 className="text-[clamp(34px,6.2vw,56px)]">{copy.landing.title}</h1>
          <p className="max-w-[34em] text-lg text-muted">{copy.landing.subtitle}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <Link className="btn btn-primary btn-lg" href="/practice">{copy.landing.cta}</Link>
            <span className="text-sm text-muted">{copy.landing.ctaNote}</span>
          </div>
        </div>
        <div className="card grid min-w-0 gap-4 p-5">
          <div className="flex items-center gap-4">
            <ChildAvatar band="upset" speaking={false} thinking={false} name="Max" size={116} showName={false} />
            <div className="grid min-w-0 flex-1 gap-2.5">
              <div className="bubble bubble-child text-[15px]">{copy.landing.previewLine}</div>
              <MoodMeter value={30} delta={null} />
            </div>
          </div>
          <div className="grid gap-2.5 border-t border-dashed border-line pt-3.5">
            <p className="eyebrow">{copy.landing.movesTitle}</p>
            <div className="flex flex-wrap gap-1.5">
              {MOVES.map(([tag, applied]) => <TagChip key={tag} tag={tag} applied={applied} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 pt-4 pb-2">
        <h2 className="text-[28px]">{copy.landing.howTitle}</h2>
        <ol className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-3">
          {copy.landing.how.map((step, i) => (
            <li key={step.title} className="card grid content-start gap-2 p-5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary-soft font-display font-extrabold text-primary">{i + 1}</span>
              <h3 className="text-[19px]">{step.title}</h3>
              <p className="text-[15px] text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 rounded-card bg-primary-soft p-6 md:grid-cols-2 md:gap-8 md:p-8">
        <div>
          <p className="font-display text-2xl leading-tight font-extrabold">{copy.landing.stat}</p>
          <p className="mt-2 text-[13px] text-muted">{copy.landing.statSource}</p>
        </div>
        <p className="self-center">{copy.landing.trust}</p>
      </section>

      <section className="mt-10 flex flex-col items-center gap-3.5 text-center">
        <h2 className="text-[28px]">{copy.brand.tagline}</h2>
        <Link className="btn btn-primary btn-lg" href="/practice">{copy.landing.cta}</Link>
      </section>
    </div>
  );
}
