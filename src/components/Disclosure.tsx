"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/*
 * "Show the details on demand": the answer stays short, the why and the source sit one tap away.
 * Compound component, so the button and the panel can live in different places of a layout:
 *   <Disclosure><Disclosure.Button>Why it works</Disclosure.Button> … <Disclosure.Panel>…</Disclosure.Panel></Disclosure>
 */
const DisclosureContext = createContext<{ open: boolean; toggle(): void; id: string } | null>(null);

function useDisclosure() {
  const ctx = useContext(DisclosureContext);
  if (!ctx) throw new Error("Disclosure.Button and Disclosure.Panel must be inside <Disclosure>");
  return ctx;
}

export function Disclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <DisclosureContext value={{ open, toggle: () => setOpen((v) => !v), id }}>{children}</DisclosureContext>;
}

Disclosure.Button = function DisclosureButton({ children }: { children: ReactNode }) {
  const { open, toggle, id } = useDisclosure();
  return (
    <button type="button" className="disclosure-btn" aria-expanded={open} aria-controls={id} onClick={toggle}>
      <Icon name="bulb" size={18} />
      {children}
      <Icon name="chevron" size={16} className="disclosure-chevron" />
    </button>
  );
};

Disclosure.Panel = function DisclosurePanel({ children }: { children: ReactNode }) {
  const { open, id } = useDisclosure();
  return <div id={id} className="disclosure-panel" hidden={!open}>{children}</div>;
};
