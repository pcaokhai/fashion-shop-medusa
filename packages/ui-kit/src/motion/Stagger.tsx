"use client";
import { Children, isValidElement, type ReactNode } from "react";
import { stagger } from "../motion";
import { Reveal } from "./Reveal";

/** Delay for the i-th item: 50 ms steps, items past the 8th get none (docs/13 §4.2). */
export const staggerDelay = (index: number): number => (index < stagger.max ? index * stagger.stepMs : 0);

/**
 * Reveals each child in turn inside a `div` grid. Each child gets a wrapper `div`, so it is not for `ul`/`ol` or for
 * grid items that need `col-span`: there put `<Reveal delayMs={staggerDelay(i)}>` on the real items.
 * ponytail: no `as` prop until the first `ul` consumer (VCK-006).
 */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={isValidElement(child) && child.key !== null ? child.key : i} delayMs={staggerDelay(i)}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
