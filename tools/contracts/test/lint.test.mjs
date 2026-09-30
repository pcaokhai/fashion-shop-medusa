/* global URL */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const repo = new URL("../../../", import.meta.url).pathname;
const run = (script, args = []) => spawnSync("node", [here(script), ...args], { cwd: repo, encoding: "utf8" });
const tmp = () => mkdtempSync(join(tmpdir(), "vck-contracts-"));

test("[VCK-004-AC1] Spectral: real openapi.yaml has 0 errors", () => {
  const r = run("lint.mjs");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("[VCK-004-AC1] Spectral: missing operationId is an error", () => {
  const spec = readFileSync(join(repo, "contracts/openapi.yaml"), "utf8");
  const mutated = spec.replace(/^\s+operationId: searchProducts\n/m, "");
  assert.notEqual(mutated, spec);
  const f = join(tmp(), "openapi.yaml");
  writeFileSync(f, mutated);
  const r = run("lint.mjs", [f]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /operation-operationId/);
});

test("[VCK-004-AC1] every real event schema compiles (Ajv 2020)", () => {
  const r = run("compile-schemas.mjs");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("[VCK-004-AC1] a schema with type: 12 fails, naming the file", () => {
  const d = tmp();
  writeFileSync(join(d, "bad.schema.json"), JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema", type: 12 }));
  const r = run("compile-schemas.mjs", [d]);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /bad\.schema\.json/);
});

test("[VCK-004-AC1] no schemas found is a failure", () => {
  assert.equal(run("compile-schemas.mjs", [tmp()]).status, 1);
});

test("[VCK-004-AC1] vectors: regenerated file is identical to committed", () => {
  const r = run("vectors.mjs");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("[VCK-004-AC1] vectors: a mutated copy of the golden file fails the diff check", () => {
  const f = join(tmp(), "golden-vectors.json");
  copyFileSync(join(repo, "contracts/vnpay/golden-vectors.json"), f);
  writeFileSync(f, readFileSync(f, "utf8").replace("HMAC-SHA512", "HMAC-SHA513"));
  const r = run("vectors.mjs", [f]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
});
