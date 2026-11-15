import Link from "next/link";
import { FamilyScene } from "@/components/FamilyScene";
import { Icon } from "@/components/Icon";
import { SebastianAvatar } from "@/components/SebastianAvatar";
import { TrackView } from "@/components/TrackView";
import { getTexts } from "@/content/server";

/** Home: one picture, one promise, one button to Sebastian. The chat lives at /coach, the story at /about. */
export default async function HomePage() {
  const { copy } = await getTexts();
  return (
    <div className="wrap">
      <TrackView event="landing_view" />
      <section className="home-hero">
        <div className="home-art">
          <FamilyScene label={copy.landing.heroArt} className="block h-auto w-full" />
        </div>
        <div className="home-copy">
          <h1 className="text-[clamp(30px,6vw,52px)]">{copy.landing.title}</h1>
          <p className="max-w-[28em] text-lg text-muted">{copy.landing.subtitle}</p>
          <Link className="btn btn-primary btn-lg btn-wrap home-cta" href="/coach">
            <SebastianAvatar size={40} decorative />
            {copy.landing.cta}
          </Link>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm min-[900px]:justify-start">
            <Link href="/practice" className="inline-flex items-center gap-1.5 font-semibold"><Icon name="play" size={16} />{copy.landing.ctaSecondary}</Link>
            <Link href="/about" className="font-semibold">{copy.nav.about}</Link>
            <span className="text-muted">{copy.landing.ctaNote}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
