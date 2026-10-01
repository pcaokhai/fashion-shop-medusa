"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface MotionPrefs {
  /** OS `prefers-reduced-motion` OR the user toggle (docs/13 §4.4). */
  reduced: boolean;
  setReducedMotion: (on: boolean) => void;
}

const MotionContext = createContext<MotionPrefs>({ reduced: false, setReducedMotion: () => undefined });

export const useMotionPrefs = (): MotionPrefs => useContext(MotionContext);

const QUERY = "(prefers-reduced-motion: reduce)";

/** Client leaf: reduced-motion preference only (OS or toggle). Context-only, so it pulls no motion JS into the layout. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [os, setOs] = useState(false);
  const [toggle, setToggle] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setOs(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const value = useMemo(() => ({ reduced: os || toggle, setReducedMotion: setToggle }), [os, toggle]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
