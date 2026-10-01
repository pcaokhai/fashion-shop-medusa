import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTokensCss } from "./drift/check";
import { parseMotionDoc } from "./drift/motion";
import { dur, ease, spring, stagger, distance } from "./motion";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const docs13 = readFileSync(resolve(root, "docs/13-ux-design-and-motion.md"), "utf8");
const css = readFileSync(resolve(root, "packages/ui-kit/src/tokens.css"), "utf8");
const tokens = parseTokensCss(css).tokens;

const asMutable = <T>(o: T): unknown => JSON.parse(JSON.stringify(o));

describe("motion tokens [VCK-009-AC4]", () => {
  it("has the documented values", () => {
    expect(dur).toEqual({ instant: 100, fast: 160, base: 220, slow: 320, expressive: 480 });
    expect(ease.enter).toEqual([0.05, 0.7, 0.1, 1]);
    expect(spring.drawer).toEqual({ stiffness: 380, damping: 34 });
    expect(spring.pop).toEqual({ stiffness: 500, damping: 22 });
    expect(stagger).toEqual({ stepMs: 50, max: 8 });
    expect(distance).toEqual({ small: 8, reveal: 16, hero: 24 });
  });

  it("motion.ts equals docs/13 §4.2", () => {
    const doc = parseMotionDoc(docs13);
    expect(asMutable({ dur, ease, spring, stagger, distance })).toEqual(
      asMutable({ dur: doc.dur, ease: doc.ease, spring: doc.spring, stagger: doc.stagger, distance: doc.distance }),
    );
  });

  it("motion.ts equals tokens.css --dur-* / --ease-*", () => {
    for (const [k, v] of Object.entries(dur)) expect(tokens[`--dur-${k}`]).toBe(`${v}ms`);
    for (const [k, v] of Object.entries(ease)) expect(tokens[`--ease-${k}`]).toBe(`cubic-bezier(${v.join(", ")})`);
  });

  it("a changed docs value breaks the sync", () => {
    for (const [from, to] of [
      ["| `--dur-fast` | 160ms |", "| `--dur-fast` | 170ms |"],
      ["stiffness 380, damping 34", "stiffness 380, damping 30"],
      ["| 50ms, max 8 items", "| 60ms, max 8 items"],
      ["16px (reveal)", "18px (reveal)"],
    ] as const) {
      expect(docs13).toContain(from);
      const doc = parseMotionDoc(docs13.replace(from, to));
      expect(asMutable({ dur, spring, stagger, distance })).not.toEqual(
        asMutable({ dur: doc.dur, spring: doc.spring, stagger: doc.stagger, distance: doc.distance }),
      );
    }
  });

  it("parser fails closed on a missing row", () => {
    expect(() => parseMotionDoc(docs13.replace("`spring.pop`", "`spring.pip`"))).toThrow(/spring\.pop/);
  });
});
