import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findRawValues } from "../../eslint/raw-values.mjs";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const block = (head: string) => css.slice(css.indexOf(head)).match(/\{([\s\S]*?\n)\}/)?.[1] ?? "";

describe("globals.css [VCK-009-AC2]", () => {
  it("imports tailwindcss before the ui-kit tokens [VCK-009-AC2]", () => {
    const tw = css.indexOf('@import "tailwindcss"');
    const tokens = css.indexOf('@import "@vck/ui-kit/tokens.css"');
    expect(tw).toBeGreaterThanOrEqual(0);
    expect(tokens).toBeGreaterThan(tw);
  });

  it("draws a 2px offset ring from --color-ring on :focus-visible [VCK-009-AC2]", () => {
    const b = block(":focus-visible");
    expect(b).toContain("outline: 2px solid var(--color-ring)");
    expect(b).toMatch(/outline-offset:\s*2px/);
  });

  it("disables animation and transition under reduced motion [VCK-009-AC2]", () => {
    const b = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(b).toMatch(/animation-duration:\s*0\.01ms/);
    expect(b).toMatch(/transition-duration:\s*0\.01ms/);
  });

  it("has no raw colour or px values [VCK-009-AC2]", () => {
    expect(findRawValues(css.replace(/@media[^{]*/g, ""))).toEqual([]);
  });
});
