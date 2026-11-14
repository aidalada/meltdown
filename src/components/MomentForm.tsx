"use client";

import { useState, type FormEvent } from "react";
import { copy } from "@/content/copy";
import { MAX_SCENARIO_TEXT } from "@/lib/constants";

/** "Today's moment" free text (SPEC 14.2). Child fields live in ChildFields. */
export function MomentForm({ busy, error, onSubmit }: { busy: boolean; error: string | null; onSubmit(text: string): void }) {
  const [text, setText] = useState("");
  const [tooShort, setTooShort] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim().length < 10) {
      setTooShort(true);
      return;
    }
    onSubmit(text.trim());
  }

  const message = tooShort ? copy.setup.tooShort : error;
  return (
    <form className="grid gap-3.5 pt-5" onSubmit={submit} noValidate>
      <div className="grid gap-1.5">
        <label className="field-label" htmlFor="moment">{copy.setup.momentLabel}</label>
        <textarea id="moment" className="textarea" maxLength={MAX_SCENARIO_TEXT} placeholder={copy.setup.momentPlaceholder}
          value={text} onChange={(e) => { setText(e.target.value); setTooShort(false); }} />
      </div>
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="counter">{text.length}/{MAX_SCENARIO_TEXT}</span>
        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? copy.setup.starting : copy.setup.start}
        </button>
      </div>
    </form>
  );
}
