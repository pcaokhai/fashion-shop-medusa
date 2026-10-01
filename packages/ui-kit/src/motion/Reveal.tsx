"use client";
import { LazyMotion, domAnimation, m } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { dur, ease, distance } from "../motion";
import { useMotionPrefs } from "./MotionProvider";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal starts; ignored under reduced motion. */
  delayMs?: number;
}

/**
 * Scroll reveal (MI-25). SSR and first paint are visible; the hidden start state is armed after mount and only for
 * content that is below the viewport, so the LCP element is never animated (docs/13 §4.5). Only opacity + translate.
 */
export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const { reduced } = useMotionPrefs();
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    // no IntersectionObserver (old webview, jsdom): motion 13 throws on arm, so stay visible
    if (typeof IntersectionObserver === "undefined") return;
    setArmed(r !== undefined && !(r.bottom > 0 && r.top < window.innerHeight));
  }, []);

  const mode = reduced ? "reduced" : "full";
  // LazyMotion lives here (not in MotionProvider) so routes without Reveal ship no motion JS (R-009-24); strict = `m` only.
  return (
    <LazyMotion features={domAnimation} strict>
      {armed ? (
        // key: initial applies only on mount, so a reduced-motion flip must remount.
        <m.div
          key={mode}
          ref={ref}
          className={className}
          data-motion={mode}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: distance.reveal }}
          whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={
            reduced
              ? { duration: dur.instant / 1000, ease: [...ease.standard] }
              : { duration: dur.expressive / 1000, ease: [...ease.enter], delay: delayMs / 1000 }
          }
        >
          {children}
        </m.div>
      ) : (
        <m.div ref={ref} className={className} data-motion={mode}>
          {children}
        </m.div>
      )}
    </LazyMotion>
  );
}
