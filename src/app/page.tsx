import Link from "next/link";
import { ChildAvatar } from "@/components/ChildAvatar";
import { MoodMeter } from "@/components/MoodMeter";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { TagChip } from "@/components/TagChip";
import { TrackView } from "@/components/TrackView";
import { getTexts } from "@/content/server";
import type { TechniqueTag } from "@/lib/types";

const MOVES: [TechniqueTag, number][] = [
  ["name_feeling", 12], ["offer_choice", 8], ["when_then", 6], ["threat", -15], ["yell_or_insult", -20],
];
/** Dot colors follow the loop: Sebastian (accent), practice (primary), the meltdown, the calm morning. */
const DAY_DOTS = ["var(--color-accent)", "var(--color-primary)", "var(--color-mood-meltdown)", "var(--color-mood-calm)"];

export default async function LandingPage() {
  const { copy } = await getTexts();
  return (
    <div className="wrap">
      <TrackView event="landing_view" />
      <section className="grid grid-cols-1 items-center gap-8 pt-8 pb-12 min-[900px]:grid-cols-[1.05fr_0.95fr] min-[900px]:gap-12 min-[900px]:pt-14 min-[900px]:pb-[72px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <p className="text-sm font-semibold text-muted">{copy.landing.kicker}</p>
          <h1 className="text-[clamp(34px,6.2vw,56px)]">{copy.landing.title}</h1>
          <p className="max-w-[34em] text-lg text-muted">{copy.landing.subtitle}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <Link className="btn btn-primary btn-lg pl-2" href="/coach">
              <SebastianAvatar size={36} decorative />
              {copy.landing.cta}
            </Link>
            <Link className="btn btn-secondary btn-lg" href="/practice">{copy.landing.ctaSecondary}</Link>
          </div>
          <p className="text-sm text-muted">{copy.landing.ctaNote}</p>
        </div>

        <div className="card hero-chain" aria-hidden="true">
          <div className="msg msg-parent max-w-[88%]"><div className="bubble bubble-parent text-[15px]">{copy.landing.previewParent}</div></div>
          <div className="coach-row">
            <SebastianAvatar size={36} decorative />
            <div className="bubble bubble-coach text-[15px]">
              <p>{copy.landing.previewCoach}</p>
              <span className="btn btn-primary justify-self-start">{copy.coach.rehearse}</span>
            </div>
          </div>
          <p className="hero-link">{copy.landing.chainLink}</p>
          <div className="flex items-center gap-4">
            <ChildAvatar band="upset" speaking={false} thinking={false} name="Max" size={104} showName={false} />
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

      <section className="grid gap-6 pt-4 pb-2" aria-labelledby="day-title">
        <div className="grid max-w-[40em] gap-2">
          <h2 id="day-title" className="text-[28px]">{copy.landing.dayTitle}</h2>
          <p className="text-muted">{copy.landing.dayIntro}</p>
        </div>
        <ol className="day-loop">
          {copy.landing.day.map((step, i) => (
            <li key={step.time} className="day-step">
              <span className="day-dot" style={{ background: DAY_DOTS[i] }} aria-hidden="true" />
              <span className="day-time">{step.time}</span>
              <h3 className="text-[19px]">{step.title}</h3>
              <p className="text-[15px] text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-4 rounded-card bg-primary-soft p-6 md:grid-cols-2 md:gap-8 md:p-8">
        <div>
          <p className="font-display text-2xl leading-tight font-extrabold">{copy.landing.stat}</p>
          <p className="mt-2 text-[13px] text-muted">{copy.landing.statSource}</p>
        </div>
        <div className="grid gap-3 self-center">
          <p>{copy.landing.trust}</p>
          <p className="font-semibold">{copy.landing.privacy}</p>
        </div>
      </section>

      <section className="mt-12 flex flex-col items-center gap-3.5 text-center">
        <h2 className="text-[28px]">{copy.brand.tagline}</h2>
        <Link className="btn btn-primary btn-lg pl-2" href="/coach">
          <SebastianAvatar size={36} decorative />
          {copy.landing.cta}
        </Link>
      </section>
    </div>
  );
}
