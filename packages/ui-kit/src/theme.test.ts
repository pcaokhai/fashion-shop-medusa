import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";
import { checkTokens, parseTokensCss } from "./drift/check";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cssPath = resolve(root, "packages/ui-kit/src/tokens.css");
const css = readFileSync(cssPath, "utf8");
const SOURCE = '@import "tailwindcss/utilities.css" layer(utilities);\n@source inline("bg-primary rounded-md bg-red-500 max-w-max text-body");\n';

const STEPS = ["caption", "small", "body", "lead", "h4", "h3", "h2", "h1", "display"];
const BODY_STEPS = ["caption", "small", "body", "lead"];

describe("tokens.css compiled with Tailwind [VCK-009-AC2]", () => {
  let out = "";
  beforeAll(async () => {
    const res = await postcss([tailwind({ base: dirname(cssPath) })]).process(SOURCE + css, { from: cssPath });
    out = res.css;
  });

  it("emits every declared token even when no class uses it", () => {
    const names = Object.keys(parseTokensCss(css).tokens);
    expect(names.length).toBeGreaterThan(70);
    const missing = names.filter((n) => !out.includes(`${n}:`));
    expect(missing).toEqual([]);
  });

  it("maps utilities to token variables and drops the default palette", () => {
    expect(out).toMatch(/\.bg-primary\s*{\s*background-color:\s*var\(--color-primary\)/);
    expect(out).toMatch(/\.rounded-md\s*{\s*border-radius:\s*var\(--radius-md\)/);
    expect(out).not.toMatch(/red-500/);
    expect(out).toMatch(/\.max-w-max\s*{\s*max-width:\s*max-content/);
  });

  it.each(STEPS)("--text-%s--line-height follows the type scale", (s) => {
    const want = BODY_STEPS.includes(s) ? "--leading-body" : "--leading-heading";
    expect(parseTokensCss(css).tokens[`--text-${s}--line-height`]).toBe(`var(${want})`);
    expect(out).toContain(`--text-${s}--line-height: var(${want})`);
  });

  it("checkTokens rejects a non-static @theme", () => {
    const bad = css.replace("@theme static {", "@theme {");
    expect(bad).not.toBe(css);
    expect(checkTokens(bad, {}).join("\n")).toMatch(/static/);
  });
});
