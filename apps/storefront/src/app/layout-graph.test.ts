// [VCK-009-AC4] Static import graph: the root layout must not pull Reveal/Stagger/`m` (R-009-24). A built-chunk size guard
// is too flaky; this fails the day someone adds a motion import to the layout path, or drops ui-kit "sideEffects".
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const uiKit = resolve(here, "../../../../packages/ui-kit");
const importsOf = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(/(?:import|export)\s[^;]*?from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");
const namedFrom = (file: string, mod: string): string[] => {
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s+"${mod}"`, "g");
  return [...readFileSync(file, "utf8").matchAll(re)].flatMap((m) => (m[1] ?? "").split(",").map((x) => x.trim()).filter(Boolean));
};
const closure = (file: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const spec of importsOf(file)) {
    if (!spec.startsWith(".")) seen.add(spec);
    else closure(resolve(dirname(file), `${spec}${/\.\w+$/.test(spec) ? "" : ".tsx"}`), seen);
  }
  return seen;
};

describe("root layout motion graph [VCK-009-AC4]", () => {
  const layout = resolve(here, "layout.tsx");
  it("imports only MotionProvider from ui-kit", () => {
    expect(namedFrom(layout, "@vck/ui-kit")).toEqual(["MotionProvider"]);
  });
  it("MotionProvider's graph has no Reveal, Stagger or motion/react", () => {
    const g = [...closure(resolve(uiKit, "src/motion/MotionProvider.tsx"))];
    expect(g.filter((x) => /Reveal|Stagger|motion\/react/.test(x))).toEqual([]);
  });
  it("ui-kit is tree-shakeable: sideEffects is css only (barrel would leak Reveal otherwise)", () => {
    const pkg = JSON.parse(readFileSync(resolve(uiKit, "package.json"), "utf8")) as { sideEffects?: unknown };
    expect(pkg.sideEffects).toEqual(["*.css"]);
  });
});
