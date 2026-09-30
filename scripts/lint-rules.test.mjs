import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const cwd = fileURLToPath(new URL("../", import.meta.url));
// Virtual files don't exist on disk, so the project service can't find them in a tsconfig;
// allowDefaultProject lets them type-check against default compiler options (strict for the rules under test).
const overrideConfig = {
  files: ["**/*.ts"], // JS files keep the real config (type-checking disabled)
  languageOptions: {
    parserOptions: {
      projectService: { allowDefaultProject: ["*/*/src/*.ts"], defaultProject: "tsconfig.base.json" },
      tsconfigRootDir: cwd,
    },
  },
};
const lint = async (code, filePath) =>
  (await new ESLint({ cwd, overrideConfig }).lintText(code, { filePath }))[0].messages;
const ids = (m) => m.map((e) => e.ruleId);
const UI = "packages/ui-kit/src/a.ts";

test("[VCK-001-AC3] packages/ importing apps/ fails", async () => {
  const m = await lint('import x from "../../apps/backend/src/index.ts"; export { x };', UI);
  assert.ok(ids(m).includes("no-restricted-imports"), JSON.stringify(m));
});

test("[VCK-001-AC3] tools/ importing @vck/storefront fails", async () => {
  const m = await lint('import x from "@vck/storefront"; export { x };', "tools/seed/src/a.ts");
  assert.ok(ids(m).includes("no-restricted-imports"), JSON.stringify(m));
});

test("[VCK-001-AC3] apps/ may import packages/ui-kit", async () => {
  const m = await lint('import x from "../../../packages/ui-kit/src/index.ts"; export { x };', "apps/storefront/src/a.ts");
  assert.ok(!ids(m).includes("no-restricted-imports"), JSON.stringify(m));
});

test("[VCK-001-AC3] no-explicit-any fires", async () => {
  const m = await lint("export const a: any = 1;", UI);
  assert.ok(ids(m).includes("@typescript-eslint/no-explicit-any"), JSON.stringify(m));
});

test("[VCK-001-AC3] no-floating-promises fires", async () => {
  const m = await lint("async function f() {}\nf();\nexport {};", UI);
  assert.ok(ids(m).includes("@typescript-eslint/no-floating-promises"), JSON.stringify(m));
});

test("[VCK-001-AC3] no-non-null-assertion fires in src, off in tests", async () => {
  const code = "export const a = [1][0]!;";
  assert.ok(ids(await lint(code, UI)).includes("@typescript-eslint/no-non-null-assertion"));
  assert.ok(!ids(await lint(code, "packages/ui-kit/src/a.test.ts")).includes("@typescript-eslint/no-non-null-assertion"));
});

test("[VCK-001-AC3] clean packages/ui-kit file has 0 messages", async () => {
  assert.deepEqual(await lint("export const a = 1;\n", UI), []);
});

test("[VCK-001-AC3] JS config file (next.config.mjs) lints clean", async () => {
  assert.deepEqual(await lint("export default {};\n", "apps/storefront/next.config.mjs"), []);
});
