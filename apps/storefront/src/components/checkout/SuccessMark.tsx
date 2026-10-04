"use client";
import { motion } from "motion/react";

export function SuccessMark() {
  return (
    <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success text-on-primary">
      <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.48, delay: 0.1 }} />
      </svg>
    </span>
  );
}
