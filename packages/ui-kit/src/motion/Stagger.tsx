"use client";
import { Children, type ReactNode } from "react";
import { stagger } from "../motion";
import { Reveal } from "./Reveal";

/** Reveals each child 50 ms after the previous; items past the 8th get no delay (docs/13 §4.2). */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} delayMs={i < stagger.max ? i * stagger.stepMs : 0}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
