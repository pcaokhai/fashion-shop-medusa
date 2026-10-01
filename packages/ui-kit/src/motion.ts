// Motion tokens. Source of truth: docs/13 §4.2; tokens.css carries the same dur/ease values (drift-tested in motion.test.ts).
/** Durations in milliseconds. */
export const dur = { instant: 100, fast: 160, base: 220, slow: 320, expressive: 480 } as const;

/** Cubic-bezier control points. */
export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 0.8, 0.15],
} as const;

export const spring = {
  drawer: { stiffness: 380, damping: 34 },
  pop: { stiffness: 500, damping: 22 },
} as const;

/** `max` items are staggered, later ones get no delay. */
export const stagger = { stepMs: 50, max: 8 } as const;

/** Translate distances in px (small, reveal, hero). */
export const distance = { small: 8, reveal: 16, hero: 24 } as const;
