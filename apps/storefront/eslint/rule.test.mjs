// [VCK-009-AC2] The real ESLint run against the storefront config, on virtual files only.
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const cwd = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({
  cwd,
  overrideConfigFile: fileURLToPath(new URL("../eslint.config.mjs", import.meta.url)),
  overrideConfig: {
    files: ["**/*.tsx"],
    languageOptions: {
      parserOptions: { projectService: { allowDefaultProject: ["apps/storefront/src/*.tsx", "apps/storefront/src/generated/*.tsx"], defaultProject: "tsconfig.base.json" } },
    },
  },
});
const ids = async (code, filePath = "src/x.tsx") => {
  const [r] = await eslint.lintText(code, { filePath: `${cwd}${filePath}` });
  return (r?.messages ?? []).map((m) => m.ruleId);
};
const RULE = "vck/no-raw-values";

describe("vck/no-raw-values via ESLint [VCK-009-AC2]", () => {
  it("fires on a JSX attribute string (Literal)", async () => {
    expect(await ids('export const A = () => <div className="bg-[#047857]" />;')).toContain(RULE);
  });
  it("fires on a style object (Literal)", async () => {
    expect(await ids('export const A = () => <div style={{ color: "#c00" }} />;')).toContain(RULE);
  });
  it("fires on a template literal (TemplateElement)", async () => {
    expect(await ids("export const c = `p-[13px]`;")).toContain(RULE);
  });
  it("fires on JSX text (JSXText)", async () => {
    expect(await ids("export const A = () => <p>rgb(1,2,3)</p>;")).toContain(RULE);
  });
  it("does not fire on token utilities", async () => {
    expect(await ids('export const A = () => <div className="bg-primary p-[1px]" />;')).not.toContain(RULE);
  });
  it("does not fire on comments", async () => {
    expect(await ids("// #123 issue\nexport const a = 1;")).not.toContain(RULE);
  });
  it("honours the documented escape hatch", async () => {
    const code = '// eslint-disable-next-line vck/no-raw-values -- anchor\nexport const h = "#add";';
    expect(await ids(code)).not.toContain(RULE);
  });
  it("reports at severity error (2), not warn", async () => {
    const [r] = await eslint.lintText('export const x = "#c00";', { filePath: `${cwd}src/x.tsx` });
    const m = r.messages.find((x) => x.ruleId === RULE);
    expect(m?.severity).toBe(2);
    expect(r.errorCount).toBeGreaterThan(0);
    const cfg = await eslint.calculateConfigForFile(`${cwd}src/x.tsx`);
    expect(cfg.rules[RULE][0]).toBe(2);
  });
  // root `**/generated/**` is the real ignore; the storefront-level entry only repeats it
  it("never lints src/generated (ignored by ESLint, no rule message)", async () => {
    const file = `${cwd}src/generated/x.ts`;
    expect(await eslint.isPathIgnored(file)).toBe(true);
    const [r] = await eslint.lintText('export const x = "#c00";', { filePath: file });
    expect(r.messages).toHaveLength(1);
    expect(r.messages[0]).toMatchObject({ ruleId: null, severity: 1 });
    expect(r.messages[0].message).toMatch(/ignore/i);
  });
  it.each(["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"])("rule is configured for src/a.%s", async (ext) => {
    const cfg = await eslint.calculateConfigForFile(`${cwd}src/a.${ext}`);
    expect(cfg.rules[RULE]?.[0]).toBe(2);
  });
  it("preserves root rules in the same run (no-explicit-any)", async () => {
    const got = await ids('export const a: any = "#c00";');
    expect(got).toContain("@typescript-eslint/no-explicit-any");
    expect(got).toContain(RULE);
  });
});
