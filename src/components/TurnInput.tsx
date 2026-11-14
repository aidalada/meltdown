"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { copy } from "@/content/copy";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { MAX_PARENT_TEXT } from "@/lib/constants";

/** Text field + mic + Send (SPEC 13.4). onSend resolves false when the text should come back. */
export function TurnInput({ disabled, onSend }: { disabled: boolean; onSend(text: string): Promise<boolean> }) {
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const mic = useSpeechRecognition((spoken) => {
    setText((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, MAX_PARENT_TEXT));
    requestAnimationFrame(grow);
  });

  function grow() {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  async function submit() {
    const value = text.trim();
    if (!value || disabled) return;
    if (mic.listening) mic.stop();
    setText("");
    requestAnimationFrame(grow);
    const sent = await onSend(value);
    if (!sent) {
      setText(value);
      requestAnimationFrame(grow);
    } else {
      field.current?.focus({ preventScroll: true });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
    if (e.key === "Escape" && mic.listening) mic.stop();
  }

  const shown = mic.listening && mic.interim ? `${text}${text ? " " : ""}${mic.interim}` : text;
  const note = mic.error === "not-allowed" ? copy.rehearsal.micBlocked : mic.listening ? copy.rehearsal.micListening : "";

  return (
    <div className="turn-input-wrap">
      <form className="turn-input" onSubmit={onSubmit}>
        <label htmlFor="turn-text" className="sr-only">{copy.rehearsal.inputLabel}</label>
        <textarea
          id="turn-text"
          ref={field}
          rows={1}
          maxLength={MAX_PARENT_TEXT}
          placeholder={copy.rehearsal.inputPlaceholder}
          value={shown}
          readOnly={mic.listening}
          onChange={(e) => { setText(e.target.value); grow(); }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className={`icon-btn ${mic.listening ? "icon-btn-listening" : ""}`}
          aria-label={mic.listening ? copy.rehearsal.micListening : copy.rehearsal.mic}
          title={copy.rehearsal.mic}
          aria-pressed={mic.listening}
          onClick={() => (mic.listening ? mic.stop() : mic.start())}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
          </svg>
        </button>
        <button type="submit" className="btn btn-primary" disabled={disabled || !text.trim()}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
          </svg>
          {copy.rehearsal.send}
        </button>
      </form>
      <div className="flex min-h-6 justify-between gap-2 px-1 pt-1.5 text-[13px] text-muted">
        <span aria-live="polite">{note}</span>
        <span className="counter">{text.length >= 300 ? `${text.length}/${MAX_PARENT_TEXT}` : ""}</span>
      </div>
    </div>
  );
}
