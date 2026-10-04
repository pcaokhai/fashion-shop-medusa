"use client";
import { useEffect, useRef, type ReactNode } from "react";

const DESKTOP = "(min-width: 48rem)";

/** Accordion on mobile (closed), always open on desktop (MASTER §5 footer). */
export function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const sync = () => {
      if (ref.current) ref.current.open = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return (
    <details ref={ref} open className="border-t border-on-surface-dark/20 py-3 md:border-0 md:py-0">
      <summary className="flex min-h-10 cursor-pointer list-none items-center font-semibold md:pointer-events-none">{title}</summary>
      {children}
    </details>
  );
}
