import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkTokens, parseTokensCss } from "./drift/check";
import { expectedTokens, parseMaster, parseMotion } from "./drift/master";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const masterText = read("design-system/vn-commerce-kit/MASTER.md");
const docs13 = read("docs/13-ux-design-and-motion.md");
const css = read("packages/ui-kit/src/tokens.css");

// Names MASTER leaves implicit (R-009-6). Explicit list, no wildcards; a docs: PR should name them in MASTER.
const CATS = ["ao", "quan", "vay", "giay", "phukien"];
const DERIVED = [
  ...CATS.map((c) => `--color-cat-${c}-ink`),
  "--color-cat-all",
  "--color-cat-all-ink",
  "--color-surface-dark",
  "--color-on-surface-dark",
  ...["caption", "small", "body", "lead", "h4", "h3", "h2", "h1", "display"].flatMap((s) => [`--text-${s}`, `--text-${s}--line-height`]),
  "--leading-body",
  "--leading-heading",
  "--tracking-heading",
  "--layout-max",
  "--font-sans",
  ...["instant", "fast", "base", "slow", "expressive"].map((d) => `--dur-${d}`),
  ...["standard", "enter", "exit"].map((e) => `--ease-${e}`),
];

const FIXTURE = `# M
## 1. Color tokens
| Role | Hex | CSS variable | Use |
| --- | --- | --- | --- |
| Primary | \`#047857\` | \`--color-primary\` | x |
| Card | \`#FFFFFF\` | \`--color-card\` | y |

**Category tints**:
\`--color-cat-ao\` \`#ECFDF5\`/\`#064E3B\` · all-products \`#1C1917\`/\`#FAFAF9\`.
Surface dark \`#1C1917\` is used for the footer.

## 2. Typography
- Family: **Be Vietnam Pro** 400; fallback \`"Noto Sans", system-ui, sans-serif\`.
- Scale (rem, 1.25 ratio): 0.75 caption · 1 body · 3.052 display (desktop only; clamp on mobile).
- Line-height: body 1.6, headings 1.2; letter-spacing headings -0.01em; max line length 72ch.

## 3. Spacing, radius, elevation
| Token | Value | Usage |
| --- | --- | --- |
| \`--space-xs/sm\` | 4/8 px | s |
| \`--radius-sm/full\` | 6/9999 px | r |
| \`--shadow-sm\` | \`0 1px 2px rgb(28 25 23 / .06)\` | c |
Container max 1280px; grid.

## 4. Style
`;

describe("parseMaster [VCK-009-AC2]", () => {
  it("parses a well-formed fixture", () => {
    const m = parseMaster(FIXTURE);
    expect(m.colors).toEqual({ "--color-primary": "#047857", "--color-card": "#FFFFFF" });
    expect(m.categories).toEqual([
      { key: "ao", tint: "#ECFDF5", ink: "#064E3B" },
      { key: "all", tint: "#1C1917", ink: "#FAFAF9" },
    ]);
    expect(m.surfaceDark).toBe("#1C1917");
    expect(m.scale).toEqual({ caption: "0.75rem", body: "1rem", display: "3.052rem" });
    expect(m.space).toEqual({ "--space-xs": "4px", "--space-sm": "8px" });
    expect(m.radius).toEqual({ "--radius-sm": "6px", "--radius-full": "9999px" });
    expect(m.shadow).toEqual({ "--shadow-sm": "0 1px 2px rgb(28 25 23 / .06)" });
    expect(m.leading).toEqual({ body: "1.6", heading: "1.2" });
    expect(m.tracking).toBe("-0.01em");
    expect(m.containerMax).toBe("1280px");
    expect(m.font).toBe('"Be Vietnam Pro", "Noto Sans", system-ui, sans-serif');
  });

  it("throws when a section is missing", () => {
    expect(() => parseMaster(FIXTURE.replace("## 2. Typography", "## 2b. Other"))).toThrow(/§2/);
    expect(() => parseMaster("# empty")).toThrow();
  });

  it("throws on zero colour rows", () => {
    const noRows = FIXTURE.replace(/\| Primary[^\n]*\n\| Card[^\n]*\n/, "");
    expect(() => parseMaster(noRows)).toThrow(/zero/i);
  });

  it("throws on a malformed colour row", () => {
    expect(() => parseMaster(FIXTURE.replace("`#047857`", "`#04785`"))).toThrow(/malformed/i);
    expect(() => parseMaster(FIXTURE.replace("`--color-card`", "--color-card"))).toThrow(/malformed/i);
  });

  it("detects a removed row and a changed hex against the same expectation", () => {
    const base = expectedTokens(parseMaster(FIXTURE), {});
    const removed = expectedTokens(parseMaster(FIXTURE.replace(/\| Card[^\n]*\n/, "")), {});
    const changed = expectedTokens(parseMaster(FIXTURE.replace("#047857", "#047858")), {});
    expect(base["--color-card"]).toBe("#FFFFFF");
    expect(removed["--color-card"]).toBeUndefined();
    expect(changed["--color-primary"]).not.toBe(base["--color-primary"]);
  });
});

describe("parseMotion [VCK-009-AC2]", () => {
  it("reads docs/13 §4.2 dur/ease rows and throws when absent", () => {
    expect(parseMotion(docs13)["--dur-fast"]).toBe("160ms");
    expect(parseMotion(docs13)["--ease-standard"]).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(() => parseMotion("nothing here")).toThrow(/zero/i);
  });
});

describe("tokens.css matches MASTER [VCK-009-AC2]", () => {
  const master = parseMaster(masterText);
  const expected = expectedTokens(master, parseMotion(docs13));
  const masterNamed = [
    ...Object.keys(master.colors),
    ...master.categories.filter((c) => c.key !== "all").map((c) => `--color-cat-${c.key}`),
    ...Object.keys(master.space),
    ...Object.keys(master.radius),
    ...Object.keys(master.shadow),
  ];

  it("parses a non-trivial MASTER and splits names into MASTER-named and DERIVED explicitly", () => {
    expect(masterNamed.length).toBe(40);
    expect(master.categories.map((c) => c.key)).toEqual([...CATS, "all"]);
    expect(Object.keys(expected).sort()).toEqual([...masterNamed, ...DERIVED].sort());
  });

  it("has no drift, no unknown and no missing token, and checks every expected token", () => {
    const parsed = parseTokensCss(css);
    expect(Object.keys(parsed.tokens).length).toBe(Object.keys(expected).length);
    expect(Object.keys(expected).length).toBeGreaterThan(0);
    expect(checkTokens(css, expected)).toEqual([]);
  });

  it("starts the theme with --color-*: initial", () => {
    expect(parseTokensCss(css).hasColorReset).toBe(true);
  });

  it("is plain CSS within 300 lines", () => {
    expect(css.split("\n").length).toBeLessThanOrEqual(300);
    expect((css.match(/@[a-z-]+/g) ?? []).filter((a) => a !== "@theme")).toEqual([]);
  });

  it("declares no --container-* token (Tailwind v4 namespace for max-w-*/@container)", () => {
    expect(Object.keys(parseTokensCss(css).tokens).filter((n) => n.startsWith("--container-"))).toEqual([]);
  });

  describe("guards fail closed (in-memory mutations)", () => {
    it("fails when one token value changes", () => {
      const bad = css.replace(/(--color-primary:\s*)#047857/i, "$1#047858");
      expect(bad).not.toBe(css);
      expect(checkTokens(bad, expected).join("\n")).toMatch(/--color-primary/);
    });
    it("fails when a token is removed", () => {
      const bad = css.replace(/\s*--color-card:[^;]*;/, "");
      expect(bad).not.toBe(css);
      expect(checkTokens(bad, expected).join("\n")).toMatch(/missing.*--color-card/);
    });
    it("fails when an unknown token is added", () => {
      const bad = css.replace("@theme static {", "@theme static {\n  --color-sneaky: #123456;");
      expect(checkTokens(bad, expected).join("\n")).toMatch(/unknown.*--color-sneaky/);
    });
    it("fails when --color-*: initial is removed", () => {
      const bad = css.replace(/--color-\*:\s*initial;/, "");
      expect(bad).not.toBe(css);
      expect(checkTokens(bad, expected).join("\n")).toMatch(/initial/);
    });
    it("fails when --color-*: initial is not the first declaration", () => {
      const bad = css.replace(/--color-\*:\s*initial;/, "").replace(/\n}\s*$/, "\n  --color-*: initial;\n}\n");
      expect(bad).not.toBe(css);
      expect(checkTokens(bad, expected).join("\n")).toMatch(/first declaration/);
    });
    it("fails on CSS outside the @theme block", () => {
      for (const extra of [":root{--color-sneaky:#f00}", "body{color:red}"]) {
        expect(checkTokens(`${css}\n${extra}\n`, expected).join("\n")).toMatch(/outside @theme/);
      }
      expect(checkTokens(`${css}\n/* a comment */\n`, expected)).toEqual([]);
    });
    it("rejects the invalid `@themestatic {` spelling", () => {
      expect(() => parseTokensCss(css.replace("@theme static {", "@themestatic {"))).toThrow(/@theme/);
    });
    it("throws when there is no @theme block", () => {
      expect(() => parseTokensCss(":root { --a: 1; }")).toThrow(/@theme/);
    });
  });
});
