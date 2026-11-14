"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackupBadge } from "@/components/BackupBadge";
import { ChildAvatar } from "@/components/ChildAvatar";
import { EndBanner } from "@/components/EndBanner";
import { Icon } from "@/components/Icon";
import { MoodMeter } from "@/components/MoodMeter";
import { SafetyNotice } from "@/components/SafetyNotice";
import { PageSkeleton } from "@/components/Skeleton";
import { Transcript, type TranscriptItem } from "@/components/Transcript";
import { TurnInput } from "@/components/TurnInput";
import { useCopy, useTexts } from "@/content/i18n";
import { useHydrated } from "@/hooks/useHydrated";
import { useSession } from "@/hooks/useSession";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { isTexting } from "@/lib/age";
import { MAX_TURNS } from "@/lib/constants";
import { bandOf } from "@/lib/engine/mood";
import { loadProfile, saveProfile } from "@/lib/storage";
import type { Profile } from "@/lib/types";

const DEFAULT_PROFILE: Profile = { version: 1, childName: "Max", ageYears: 4, temperament: "strong-willed", coachHints: true, voiceOn: true };

export default function RehearsalPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Rehearsal key={id} id={id} />;
}

function ThinkingNote({ name }: { name: string }) {
  const copy = useCopy();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(timer);
  }, []);
  return <p className="think-note min-h-[18px] text-[13px] text-muted" aria-live="polite">{show ? copy.rehearsal.thinking(name) : ""}</p>;
}

function Switch({ checked, label, onToggle }: { checked: boolean; label: string; onToggle(): void }) {
  return (
    <button className="switch" type="button" role="switch" aria-checked={checked} onClick={onToggle}>
      <span className="knob" aria-hidden="true" />
      {label}
    </button>
  );
}

function Rehearsal({ id }: { id: string }) {
  const { copy, scenario: sceneText } = useTexts();
  const router = useRouter();
  const voice = useSpeechSynthesis();
  const [profile, setProfile] = useState<Profile>(() => loadProfile() ?? DEFAULT_PROFILE);
  const [started, setStarted] = useState(false);
  const speakRef = useRef<(text: string) => void>(() => {});

  const onReply = useCallback((reply: string) => speakRef.current(reply), []);
  const { session, status, pending, pendingText, lastSource, safety, error, sendTurn, endSession, dismissSafety } = useSession(id, onReply);
  // From 12 the rehearsal is a text chat with a teen: no 2D child, and texts are not read aloud.
  const texting = session ? isTexting(session.scenario.ageYears) : false;

  useEffect(() => {
    speakRef.current = (text: string) => {
      if (profile.voiceOn && started && !texting) voice.speak(text);
    };
  });

  if (status === "not_found" || !session) {
    return (
      <div className="wrap wrap-narrow grid gap-4 py-16 text-center">
        <h1 className="text-2xl">{copy.rehearsal.notFound}</h1>
        <div><Link className="btn btn-primary" href="/practice">{copy.rehearsal.backToSetup}</Link></div>
      </div>
    );
  }

  const s = session;
  const band = bandOf(s.mood);
  const lastTurn = s.turns.length ? s.turns[s.turns.length - 1] : null;
  const ended = s.status === "ended";
  const turnNumber = Math.min(s.turns.length + (ended ? 0 : 1), MAX_TURNS);
  const usedBackup = lastSource === "fallback" || s.turns.some((t) => t.source === "fallback");

  const items: TranscriptItem[] = [{ role: "child", text: s.scenario.openingLine }];
  for (const t of s.turns) {
    items.push({ role: "parent", text: t.parentText, tags: t.tags }, { role: "child", text: t.childReply });
  }
  if (pendingText) items.push({ role: "parent", text: pendingText, tags: [] }, { role: "thinking", name: s.scenario.childName });

  function updateProfile(patch: Partial<Profile>) {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
    if (patch.voiceOn === false) voice.cancel();
  }

  function start() {
    setStarted(true);
    if (profile.voiceOn && !texting) voice.speak(lastTurn ? lastTurn.childReply : s.scenario.openingLine);
  }

  function toDebrief() {
    voice.cancel();
    router.push(`/practice/${s.id}/debrief`);
  }

  function end() {
    voice.cancel();
    if (s.turns.length === 0) {
      router.push("/practice");
      return;
    }
    endSession("ended_by_parent");
    router.push(`/practice/${s.id}/debrief`);
  }

  // Shared by both layouts: what sits under the conversation, and the "Start rehearsal" card.
  const controls = (
    <>
      {error === "rate_limited" && <p className="form-error" role="alert">{copy.rehearsal.rateLimited}</p>}
      {ended && s.outcome !== "ended_by_parent" && (
        <EndBanner outcome={s.outcome} name={s.scenario.childName} turns={s.turns.length} onDebrief={toDebrief} />
      )}
      {ended && s.outcome === "ended_by_parent" && (
        <div><button className="btn btn-primary" type="button" onClick={toDebrief}>{copy.rehearsal.toDebrief}</button></div>
      )}
      {!ended && <TurnInput disabled={pending || !started} onSend={sendTurn} placeholder={texting ? copy.rehearsal.textPlaceholder : undefined} />}
    </>
  );
  const startCard = (
    <>
      <h2 className="text-[22px]">{sceneText(s.scenario).title}</h2>
      <p className="text-[15px] text-muted">{sceneText(s.scenario).setting}</p>
      <button className="btn btn-primary btn-lg" type="button" onClick={start} autoFocus>{copy.rehearsal.startOverlay}</button>
    </>
  );

  return (
    <div className="wrap">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
        <div className="min-w-0 flex-[1_1_260px]">
          <h1 className="text-[22px]">{sceneText(s.scenario).title}</h1>
          <p className="text-sm text-muted">{s.scenario.childName}, {s.scenario.ageYears} · {sceneText(s.scenario).setting}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill">{copy.rehearsal.turnOf(turnNumber, MAX_TURNS)}</span>
          {s.difficulty === "hard" && <span className="pill pill-accent">{copy.rehearsal.hard}</span>}
          {!texting && <Switch checked={profile.voiceOn} label={copy.rehearsal.voice} onToggle={() => updateProfile({ voiceOn: !profile.voiceOn })} />}
          <Switch checked={profile.coachHints} label={copy.rehearsal.hints} onToggle={() => updateProfile({ coachHints: !profile.coachHints })} />
          <button className="btn btn-secondary" type="button" onClick={end}>{copy.rehearsal.end}</button>
        </div>
      </div>

      {texting ? (
        <div className="relative mx-auto grid w-full max-w-[560px] grid-cols-[minmax(0,1fr)] gap-3">
          <div className="card texting">
            <div className="texting-head">
              <span className="texting-initial" aria-hidden="true">{s.scenario.childName.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="leading-tight font-semibold">{s.scenario.childName}</p>
                <p className="text-[13px] text-muted" aria-live="polite">{pending ? copy.rehearsal.typing : copy.rehearsal.online}</p>
              </div>
              <BackupBadge visible={usedBackup} />
            </div>
            <div className="texting-meter">
              <MoodMeter value={s.mood} delta={lastTurn ? lastTurn.delta : null} deltaKey={s.turns.length} />
            </div>
            <div className="texting-body">
              <Transcript items={items} showHints={profile.coachHints} variant="texting" />
            </div>
          </div>
          {controls}
          {!started && !ended && (
            <div className="overlay">
              <div className="card m-4 grid max-w-[360px] justify-items-center gap-3 p-6 text-center">
                <span className="child-badge-chat" style={{ width: 96, height: 96 }} aria-hidden="true"><Icon name="say" size={44} /></span>
                {startCard}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative grid grid-cols-[minmax(0,1fr)] gap-4 min-[900px]:grid-cols-[340px_minmax(0,1fr)] min-[900px]:items-start min-[900px]:gap-6">
          <aside className="card stage" aria-label={s.scenario.childName}>
            <ChildAvatar key={s.turns.length} band={band} speaking={voice.speaking} thinking={pending} name={s.scenario.childName} age={s.scenario.ageGroup} pop={s.turns.length > 0} />
            <MoodMeter value={s.mood} delta={lastTurn ? lastTurn.delta : null} deltaKey={s.turns.length} />
            <div className="flex flex-wrap justify-center gap-1.5 max-[899px]:justify-start">
              <BackupBadge visible={usedBackup} />
            </div>
            {pending && <ThinkingNote name={s.scenario.childName} />}
          </aside>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
            <Transcript items={items} showHints={profile.coachHints} />
            {controls}
          </div>

          {!started && !ended && (
            <div className="overlay">
              <div className="card m-4 grid max-w-[360px] justify-items-center gap-3 p-6 text-center">
                <ChildAvatar band={band} speaking={false} thinking={false} name={s.scenario.childName} age={s.scenario.ageGroup} size={120} showName={false} />
                {startCard}
              </div>
            </div>
          )}
        </div>
      )}

      {safety !== "none" && <SafetyNotice kind={safety} onContinue={dismissSafety} />}
    </div>
  );
}
