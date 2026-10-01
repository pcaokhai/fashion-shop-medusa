import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

const calls: Record<string, unknown>[] = [];
vi.mock("next/font/google", () => ({
  Be_Vietnam_Pro: (opts: Record<string, unknown>) => {
    calls.push(opts);
    return { variable: "mock-variable-class" };
  },
}));

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// unicode-range of the `latin` and `vietnamese` subsets of Be Vietnam Pro,
// copied from the Google Fonts CSS2 response (fonts.googleapis.com/css2?family=Be+Vietnam+Pro).
const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const VIETNAMESE =
  "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB";

function covered(text: string, ranges: string): boolean {
  const spans = ranges.split(",").map((r) => {
    const [lo, hi = lo] = r.trim().slice(2).split("-");
    return [parseInt(lo ?? "", 16), parseInt(hi ?? "", 16)] as const;
  });
  return [...text].every((ch) => {
    const cp = ch.codePointAt(0) ?? -1;
    return spans.some(([lo, hi]) => cp >= lo && cp <= hi);
  });
}

describe("Be Vietnam Pro font [VCK-009-AC3]", () => {
  beforeAll(async () => {
    await import("./fonts");
  });

  it("requests weights, subsets, swap and the CSS variable [VCK-009-AC3]", () => {
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ display: "swap", variable: "--font-be-vietnam-pro" });
    expect(calls[0]?.weight).toEqual(["400", "500", "600", "700"]);
    expect(calls[0]?.subsets).toEqual(expect.arrayContaining(["vietnamese", "latin"]));
  });

  it("starts --font-sans with Be Vietnam Pro [VCK-009-AC3]", () => {
    expect(read("../../../../packages/ui-kit/src/tokens.css")).toMatch(/--font-sans:\s*"Be Vietnam Pro"/);
  });

  it("layout sets lang=vi and the font variable [VCK-009-AC3]", () => {
    const src = read("./layout.tsx");
    expect(src).toContain('<html lang="vi"');
    expect(src).toContain("beVietnamPro.variable");
  });

  it("subset ranges cover Vietnamese sale copy but not CJK [VCK-009-AC3]", () => {
    const both = `${LATIN}, ${VIETNAMESE}`;
    expect(covered("Ưu đãi đặc biệt – Giảm 30% – Đồng hồ", both)).toBe(true);
    expect(covered("Ưu đãi 漢", both)).toBe(false);
  });
});
