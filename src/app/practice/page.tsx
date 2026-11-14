"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChildFields, type ChildValues } from "@/components/ChildFields";
import { MomentForm } from "@/components/MomentForm";
import { SafetyNotice } from "@/components/SafetyNotice";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { PageSkeleton } from "@/components/Skeleton";
import { useCopy } from "@/content/i18n";
import { useHydrated } from "@/hooks/useHydrated";
import { createSession } from "@/hooks/useSession";
import { track } from "@/lib/analytics";
import { postScenario, RateLimitedError } from "@/lib/api-client";
import { ageGroupOf } from "@/lib/data";
import { DEFAULT_PROFILE, loadProfile, saveProfile } from "@/lib/storage";
import type { Profile, Scenario } from "@/lib/types";

export default function PracticePage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <PracticeSetup />;
}

function PracticeSetup() {
  const copy = useCopy();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(() => loadProfile() ?? DEFAULT_PROFILE);
  const [tab, setTab] = useState<"today" | "common">("today");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safety, setSafety] = useState<"child_at_risk" | "parent_crisis" | null>(null);

  function updateChild(next: ChildValues) {
    const updated = { ...profile, ...next };
    setProfile(updated);
    saveProfile(updated);
  }

  /** The child chosen above plays every common moment, so the age and avatar stay the parent's choice. */
  function resolvePreset(preset: Scenario): Scenario {
    return {
      ...preset,
      childName: profile.childName,
      ageYears: profile.ageYears,
      ageGroup: ageGroupOf(profile.ageYears),
      temperament: profile.temperament,
    };
  }

  function begin(scenario: Scenario) {
    saveProfile(profile);
    const session = createSession(scenario);
    track("start_practice", {
      source: scenario.source,
      ageGroup: scenario.ageGroup,
      ...(scenario.source === "preset" ? { scenarioId: scenario.id } : {}),
    });
    router.push(`/practice/${session.id}`);
  }

  async function submitMoment(text: string) {
    setBusy(true);
    setError(null);
    try {
      const { result, source } = await postScenario({
        text, childName: profile.childName, ageYears: profile.ageYears, temperament: profile.temperament,
      });
      track("scenario_result", { kind: result.kind, source });
      if (result.kind === "ok") {
        begin(result.scenario);
        return;
      }
      if (result.kind === "off_topic") setError(copy.setup.offTopic);
      else {
        setSafety(result.safety);
        track("safety_shown", { kind: result.safety });
      }
      setBusy(false);
    } catch (e) {
      setError(e instanceof RateLimitedError ? copy.rehearsal.rateLimited : copy.setup.offTopic);
      setBusy(false);
    }
  }

  return (
    <div className="wrap wrap-narrow">
      <div className="grid gap-2 pt-7 pb-5">
        <h1 className="text-[clamp(28px,4.6vw,40px)]">{copy.setup.title}</h1>
      </div>
      <ChildFields value={profile} onChange={updateChild} />
      <div className="tabs mt-5" role="tablist" aria-label={copy.setup.title}>
        <button role="tab" type="button" id="tab-today" aria-controls="panel-today" aria-selected={tab === "today"} onClick={() => setTab("today")}>
          {copy.setup.tabToday}
        </button>
        <button role="tab" type="button" id="tab-common" aria-controls="panel-common" aria-selected={tab === "common"} onClick={() => setTab("common")}>
          {copy.setup.tabCommon}
        </button>
      </div>
      <div id="panel-today" role="tabpanel" aria-labelledby="tab-today" hidden={tab !== "today"}>
        <MomentForm busy={busy} error={error} onSubmit={submitMoment} />
      </div>
      <div id="panel-common" role="tabpanel" aria-labelledby="tab-common" hidden={tab !== "common"}>
        <ScenarioPicker onPick={begin} resolve={resolvePreset} />
      </div>
      {safety && <SafetyNotice kind={safety} onContinue={() => setSafety(null)} />}
    </div>
  );
}
