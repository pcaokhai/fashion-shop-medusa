"use client";
import { LazyMotion, domAnimation } from "motion/react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface MotionPrefs {
  /** OS `prefers-reduced-motion` OR the user toggle (docs/13 §4.4). */
  reduced: boolean;
  setReducedMotion: (on: boolean) => void;
}

const MotionContext = createContext<MotionPrefs>({ reduced: false, setReducedMotion: () => undefined });

export const useMotionPrefs = (): MotionPrefs => useContext(MotionContext);

const QUERY = "(prefers-reduced-motion: reduce)";

/** Client leaf: loads the small `domAnimation` feature set once; only `m` components may render inside (strict). */
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
  return (
    <MotionContext.Provider value={value}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionContext.Provider>
  );
}
