import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTokensCss } from "./drift/check";
import { contrast } from "./drift/wcag";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "tokens.css"),
  "utf8",
);
const t = parseTokensCss(css).tokens;
const c = (name: string): string => {
  const v = t[name];
  if (!v) throw new Error(`missing token ${name}`);
  return v;
};
const BLACK = "#000000";

describe("contrast() [VCK-009-AC2]", () => {
  it("matches known WCAG values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#123456", "#123456")).toBeCloseTo(1, 5);
    expect(contrast("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    expect(contrast("#fff", "#000")).toBeCloseTo(21, 5);
  });
  it("rejects malformed colours", () => {
    expect(() => contrast("red", "#FFFFFF")).toThrow();
  });
});

describe("token contrast [VCK-009-AC2]", () => {
  const text: [string, string, string][] = [
    ["primary on-primary", "--color-on-primary", "--color-primary"],
    ["cta on-primary", "--color-on-primary", "--color-cta"],
    ["foreground/background", "--color-foreground", "--color-background"],
    ["heading/background", "--color-heading", "--color-background"],
    ["muted-foreground/background", "--color-muted-foreground", "--color-background"],
    ["muted-foreground/card", "--color-muted-foreground", "--color-card"],
    ["price-sale/card", "--color-price-sale", "--color-card"],
    ["warning/card", "--color-warning", "--color-card"],
    ["destructive/card", "--color-destructive", "--color-card"],
    ["on-surface-dark/surface-dark", "--color-on-surface-dark", "--color-surface-dark"],
  ];
  it.each(text)("%s >= 4.5:1", (_n, fg, bg) => {
    expect(contrast(c(fg), c(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("surface-dark pair >= 7:1", () => {
    expect(contrast(c("--color-on-surface-dark"), c("--color-surface-dark"))).toBeGreaterThanOrEqual(7);
  });

  it.each(["ao", "quan", "vay", "giay", "phukien", "all"])("category %s ink on tint >= 7:1", (k) => {
    expect(contrast(c(`--color-cat-${k}-ink`), c(`--color-cat-${k}`))).toBeGreaterThanOrEqual(7);
  });

  it("ring/background >= 3:1 (non-text)", () => {
    expect(contrast(c("--color-ring"), c("--color-background"))).toBeGreaterThanOrEqual(3);
  });

  // MASTER's own stated numbers (2 decimals unless MASTER gives fewer).
  const stated: [string, string, string, number, number][] = [
    ["primary white", "--color-on-primary", "--color-primary", 5.48, 2],
    ["cta white", "--color-on-primary", "--color-cta", 5.18, 2],
    ["sale price on white", "--color-price-sale", "--color-card", 6.47, 2],
    ["foreground body", "--color-foreground", "--color-background", 16.7, 1],
    ["heading", "--color-heading", "--color-background", 9.3, 1],
    ["muted foreground (on card)", "--color-muted-foreground", "--color-card", 7.6, 1],
  ];
  it.each(stated)("MASTER states %s = %f", (_n, fg, bg, num, digits) => {
    expect(contrast(c(fg), c(bg))).toBeCloseTo(num, digits);
  });
  it("MASTER states black on accent = 5.9", () => {
    expect(contrast(BLACK, c("--color-accent"))).toBeCloseTo(5.9, 1);
  });

  it("KNOWN EXEMPTION: rating on card stays < 3:1 (stars accompany a numeric rating; docs: follow-up to MASTER)", () => {
    const r = contrast(c("--color-rating"), c("--color-card"));
    expect(r).toBeCloseTo(2.15, 2);
    // fails the day the pair reaches 3:1 so the exemption note gets removed
    expect(r).toBeLessThan(3);
  });

  it("negative: wrong pairings fail, so the thresholds are not vacuous", () => {
    expect(contrast(c("--color-on-primary"), c("--color-background"))).toBeLessThan(4.5);
    expect(contrast(c("--color-primary"), c("--color-cta"))).toBeLessThan(4.5);
    expect(contrast(c("--color-cat-ao"), c("--color-cat-quan"))).toBeLessThan(7);
  });
});
