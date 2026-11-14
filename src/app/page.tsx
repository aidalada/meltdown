import { CoachChat } from "@/components/CoachChat";
import { TrackView } from "@/components/TrackView";

/** Home is the chat with Sebastian. The product story lives at /about. */
export default function HomePage() {
  return (
    <>
      <TrackView event="landing_view" />
      <CoachChat />
    </>
  );
}
