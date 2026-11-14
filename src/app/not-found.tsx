import Link from "next/link";
import { ChildAvatar } from "@/components/ChildAvatar";
import { getTexts } from "@/content/server";

export default async function NotFound() {
  const { copy } = await getTexts();
  return (
    <div className="wrap wrap-narrow grid justify-items-center gap-4 py-16 text-center">
      <ChildAvatar band="grumpy" speaking={false} thinking={false} name="Max" size={140} showName={false} />
      <h1 className="text-[clamp(26px,4vw,36px)]">{copy.notFound.title}</h1>
      <p className="max-w-[36em] text-muted">{copy.notFound.body}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Link className="btn btn-primary" href="/practice">{copy.nav.start}</Link>
        <Link className="btn btn-secondary" href="/">{copy.notFound.home}</Link>
      </div>
    </div>
  );
}
