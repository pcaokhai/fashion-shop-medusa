import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const STUBS = ["apps/backend", "apps/storefront", "packages/ui-kit", "tools/seed"];

const workspaces = ["apps", "packages", "tools"].flatMap((g) =>
  readdirSync(new URL(`${g}/`, root), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(new URL(`${g}/${d.name}/package.json`, root)))
    .map((d) => `${g}/${d.name}`),
);

test("[VCK-001-AC2] each workspace has lint, typecheck, test scripts", () => {
  for (const dir of STUBS) assert.ok(workspaces.includes(dir), `${dir} not found`);
  for (const dir of workspaces) {
    const { scripts } = json(`${dir}/package.json`);
    for (const s of ["lint", "typecheck", "test"]) assert.ok(scripts?.[s], `${dir} lacks ${s}`);
  }
});

test("[VCK-001-AC1] engines.node allows Node 20.19+ and .nvmrc is 20", () => {
  assert.equal(json("package.json").engines.node, "^20.19.0 || ^22.13.0 || >=24");
  assert.equal(readFileSync(new URL(".nvmrc", root), "utf8").trim(), "20");
});

test("[VCK-001-AC3] tsconfig.base.json enables strict flags", () => {
  const { compilerOptions: c } = json("tsconfig.base.json");
  for (const k of ["strict", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes"]) assert.equal(c[k], true, k);
  assert.ok(c.module && c.moduleResolution);
  for (const dir of STUBS) assert.equal(json(`${dir}/tsconfig.json`).extends, "../../tsconfig.base.json", dir);
});

test("[VCK-001-AC1] turbo.json globalDependencies covers tsconfig.base.json and eslint.config.mjs", () => {
  const g = json("turbo.json").globalDependencies ?? [];
  for (const f of ["tsconfig.base.json", "eslint.config.mjs"]) assert.ok(g.includes(f), `${f} missing`);
});
