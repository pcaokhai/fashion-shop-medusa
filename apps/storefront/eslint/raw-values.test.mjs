// [VCK-009-AC2] findRawValues: positive corpus must be flagged, negative corpus must not.
import { describe, expect, it } from "vitest";
import { findRawValues } from "./raw-values.mjs";

const kinds = (s) => findRawValues(s).map((h) => h.kind);

const POSITIVE = [
  ["hex3", "#fff", "hex"], ["hex4", "#ffff", "hex"], ["hex6 upper", "#FFFFFF", "hex"], ["hex8", "#FFFFFF80", "hex"],
  ["tailwind hex", "bg-[#047857]", "hex"], ["style obj", 'color: "#c00"', "hex"], ["css hex", "a{color:#fff}", "hex"],
  ["rgb", "rgb(1 2 3)", "colour-fn"], ["rgba", "rgba(0,0,0,.5)", "colour-fn"], ["hsl", "hsl(0 0% 0%)", "colour-fn"],
  ["hsla", "hsla(0,0%,0%,1)", "colour-fn"], ["hwb", "hwb(0 0% 0%)", "colour-fn"], ["lab", "lab(1 2 3)", "colour-fn"],
  ["lch", "lch(1 2 3)", "colour-fn"], ["oklab", "oklab(1 2 3)", "colour-fn"], ["oklch", "oklch(68% .2 250)", "colour-fn"],
  ["color()", "color(srgb 1 0 0)", "colour-fn"], ["uppercase RGB", "RGB(1,2,3)", "colour-fn"],
  ["space before paren", "rgb (1,2,3)", "colour-fn"], ["color-mix raw named", "color-mix(in oklab, red 10%, transparent)", "color-mix"],
  ["color-mix raw hex (hex rule)", "color-mix(in oklab, #fff 10%, var(--x))", "hex"],
  ["px 13", "13px", "px"], ["rgb( lead space", "rgb( 1,2,3)", "colour-fn"], ["RGB space paren", "RGB (1,2,3)", "colour-fn"],
  ["rgb newline", "rgb(\n1,2,3)", "colour-fn"], ["oklch literal", "oklch(.5 .2 250)", "colour-fn"],
  ["var colour fn + hex", "rgb(var(--x)) #fff", "hex"], ["from var + px", "oklch(from var(--x) l c h) 13px", "px"],
  ["var colour fn, px arg", "hsl(var(--h) 10% 13px)", "px"], ["var not first arg", "rgb(1, var(--x), 3)", "colour-fn"],
  ["fn named like var", "rgb(variable 1 2)", "colour-fn"], ["from literal", "oklch(from #fff l c h)", "hex"], ["px after hyphen", "w-13px", "px"], ["color-mix var fallback literal", "color-mix(in oklab, var(--x, red) 10%, transparent)", "color-mix"], ["tailwind px", "p-[13px]", "px"], ["negative px", "m-[-13px]", "px"], ["-3px", "-3px", "px"],
  ["0.5px is flagged (only 0/1/2px allowed)", "0.5px", "px"], ["1.5px", "1.5px", "px"], [".5px", ".5px", "px"],
  ["uppercase PX", "13PX", "px"], ["css padding", "a{padding:13px}", "px"], ["template-ish", "p-[13px] ${x}", "px"],
];
const NEGATIVE = [
  "var(--color-primary)", "bg-primary", "text-muted-foreground", "currentColor transparent inherit",
  "border-[1px] 0px 2px", "1px", "-1px", "-2px", "1.0px", "color-mix(in oklab, var(--color-primary) 10%, transparent)",
  'href="#"', 'href="#section"', "url(#a)", "http://x.test/#fff", "&#123;", "#12", "#12345", "#1234567", "#fffffffff",
  "scolor(1)", "my-color(1)", "1px solid var(--color-border)", "oklch(from var(--primary) l c h / .5)", "rgb(var(--x))", "hsl(var(--h) 10% 10%)",
  "rgba(var(--x) / .5)", "color(from var(--x) srgb r g b)", "RGB( VAR(--x))", "rgb(\nvar(--x))", "color-mix(in oklab, var(--color-red) 10%, var(--white))", "13", "px", "rem 1rem", "h1px", "calc(var(--space-4) * 2)",
];

describe("findRawValues [VCK-009-AC2]", () => {
  it.each(POSITIVE)("flags %s", (_n, text, kind) => {
    expect(kinds(text)).toContain(kind);
  });
  it.each(NEGATIVE)("allows %s", (text) => {
    expect(findRawValues(text)).toEqual([]);
  });
  it("reports value and index", () => {
    expect(findRawValues("a #fff b 13px")).toEqual([
      { kind: "hex", value: "#fff", index: 2 },
      { kind: "px", value: "13px", index: 9 },
    ]);
  });
  it("known false positives are documented: hex-like words", () => {
    for (const w of ["#decade", "#add", "#bad"]) expect(kinds(w)).toEqual(["hex"]);
  });
  it("unicode and mixed text", () => {
    expect(kinds("Đơn hàng #1001 ✓ 日本")).toEqual(["hex"]);
    expect(findRawValues("Đơn hàng ✓ 日本語 — rgb")).toEqual([]);
  });
  it("is linear on 1 MB hostile lines", () => {
    const lines = ["#".repeat(1e6), "#" + "a".repeat(1e6) + "x", "1".repeat(1e6), "rgb ".repeat(250000), "color-mix(".repeat(100000), "-".repeat(1e6) + "1px", "(".repeat(1e6), "rgb(var(".repeat(3e5), " ".repeat(2e6) + "rgb(", "oklch(from ".repeat(2e5)];
    const t = Date.now();
    for (const l of lines) findRawValues(l);
    expect(Date.now() - t).toBeLessThan(5000);
  });
});
