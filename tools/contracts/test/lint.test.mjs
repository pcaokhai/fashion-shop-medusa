/* global URL, process */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const run = (script, args = [], env = {}) => spawnSync(process.execPath, [here(script), ...args], { cwd: repo, encoding: "utf8", env: { ...process.env, ...env } });
const tmpDirs = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "vck-contracts-"));
  tmpDirs.push(d);
  return d;
};
after(() => tmpDirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

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

const realSpec = () => readFileSync(join(repo, "contracts/openapi.yaml"), "utf8");
const lintMutated = (from, to) => {
  const spec = realSpec();
  assert.ok(spec.includes(from), `fixture anchor missing: ${from}`);
  const f = join(tmp(), "openapi.yaml");
  writeFileSync(f, spec.replace(from, to));
  return run("lint.mjs", [f]);
};

test("[VCK-004-AC1] lint fails closed on a missing spec path", () => {
  assert.notEqual(run("lint.mjs", [join(tmp(), "nope.yaml")]).status, 0);
});

test("[VCK-004-AC1] lint fails closed on a ruleset extending a missing file", () => {
  const d = tmp();
  const rs = join(d, ".spectral.yaml");
  writeFileSync(rs, "extends: [./does-not-exist.yaml]\n");
  assert.notEqual(run("lint.mjs", [join(repo, "contracts/openapi.yaml"), rs]).status, 0);
});

test("[VCK-004-AC1] vck-money-not-float flags amount as type number, also in a type array", () => {
  const anchor = /(\s{4}VietqrInstruction:[\s\S]*?\n\s{8}amount: )\{ \$ref: '#\/components\/schemas\/Money' \}/;
  assert.match(realSpec(), anchor);
  for (const t of ["{ type: number }", "{ type: [number, 'null'] }"]) {
    const f = join(tmp(), "openapi.yaml");
    writeFileSync(f, realSpec().replace(anchor, `$1${t}`));
    const r = run("lint.mjs", [f]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /vck-money-not-float/);
  }
});

test("[VCK-004-AC1] vck-money-not-float flags _amount, _vnd and price_ names", () => {
  for (const [from, to] of [
    ["expected_amount: { $ref: '#/components/schemas/Money' }", "expected_amount: { type: number }"],
    ["provider_amount: { type: [integer, 'null'] }", "provider_vnd: { type: number }"],
    ["price_min: { $ref: '#/components/schemas/Money' }", "price_min: { type: number }"],
  ]) {
    const r = lintMutated(from, to);
    assert.equal(r.status, 1, `${to}\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /vck-money-not-float/);
  }
});

test("[VCK-004-AC1] vck-problem-json-errors flags an error response without problem+json", () => {
  const r = lintMutated("'503': { $ref: '#/components/responses/Problem' }", "'503': { description: x }");
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /vck-problem-json-errors/);
});

// vectors: temp git repo holding a copy of the generator and golden file; VCK_ROOT points the script at it.
const vectorRepo = (mutate) => {
  const d = tmp();
  mkdirSync(join(d, "contracts/vnpay"), { recursive: true });
  for (const f of ["generate_vectors.py", "golden-vectors.json"]) writeFileSync(join(d, "contracts/vnpay", f), readFileSync(join(repo, "contracts/vnpay", f)));
  if (mutate) writeFileSync(join(d, "contracts/vnpay/golden-vectors.json"), readFileSync(join(d, "contracts/vnpay/golden-vectors.json"), "utf8").replace("HMAC-SHA512", "HMAC-SHA513"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: d, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "-m", "x");
  return { d, git, golden: join(d, "contracts/vnpay/golden-vectors.json") };
};

test("[VCK-004-AC1] vectors: real golden file exists and regenerated output matches HEAD", () => {
  assert.ok(existsSync(join(repo, "contracts/vnpay/golden-vectors.json")));
  const r = run("vectors.mjs");
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("[VCK-004-AC1] vectors: clean temp repo passes", () => {
  assert.equal(run("vectors.mjs", [], { VCK_ROOT: vectorRepo(false).d }).status, 0);
});

test("[VCK-004-AC1] vectors: committed file stale vs generator fails", () => {
  assert.equal(run("vectors.mjs", [], { VCK_ROOT: vectorRepo(true).d }).status, 1);
});

test("[VCK-004-AC1] vectors: uncommitted edit (unstaged or staged) is refused and left untouched", () => {
  for (const stage of [false, true]) {
    const { d, git, golden } = vectorRepo(false);
    writeFileSync(golden, readFileSync(golden, "utf8") + " ");
    if (stage) git("add", "-A");
    const before = readFileSync(golden, "utf8");
    const r = run("vectors.mjs", [], { VCK_ROOT: d });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /uncommitted/);
    assert.equal(readFileSync(golden, "utf8"), before);
  }
});

test("[VCK-004-AC1] vectors: python3 absent gives a clear message", () => {
  const r = run("vectors.mjs", [], { VCK_ROOT: vectorRepo(false).d, PATH: tmp() });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /python3 is required/);
});

// warning ratchet: the real spec against temp baselines (docs/08 "0 new warnings")
const REAL = { "info-contact": 1, "operation-description": 30 };
const withBaseline = (content) => {
  const f = join(tmp(), "lint-baseline.json");
  if (content !== undefined) writeFileSync(f, typeof content === "string" ? content : JSON.stringify(content));
  return run("lint.mjs", [join(repo, "contracts/openapi.yaml"), join(repo, ".spectral.yaml"), f]);
};

test("[VCK-004-AC1] ratchet: baseline equal to current counts passes", () => {
  const r = withBaseline(REAL);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("[VCK-004-AC1] ratchet: one warning above baseline of a known code fails", () => {
  const r = withBaseline({ ...REAL, "operation-description": 29 });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /operation-description/);
});

test("[VCK-004-AC1] ratchet: a code missing from the baseline fails", () => {
  const r = withBaseline({ "operation-description": REAL["operation-description"] });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /info-contact/);
});

test("[VCK-004-AC1] ratchet: fewer warnings than baseline passes with a hint to lower it", () => {
  const r = withBaseline({ ...REAL, "operation-description": 31 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /lower .*baseline/i);
});

test("[VCK-004-AC1] ratchet: missing or malformed baseline fails closed", () => {
  for (const c of [undefined, "{not json", "[]", '{"info-contact":"1"}', '{"info-contact":-1}']) {
    const r = withBaseline(c);
    assert.notEqual(r.status, 0, `${c}\n${r.stdout}${r.stderr}`);
  }
});
