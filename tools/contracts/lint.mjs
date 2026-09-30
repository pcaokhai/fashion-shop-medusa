/* global process, console, URL */
// Usage: node lint.mjs [spec] [ruleset] [baseline]  (defaults: contracts/openapi.yaml, .spectral.yaml at repo root, lint-baseline.json here)
// Warning ratchet (docs/08 "0 new warnings"): non-error results may not exceed the per-code counts in the baseline.
// Fails closed: any spawn error, unexpected exit status, or unparseable output is a failure.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const spec = resolve(process.argv[2] ?? `${root}contracts/openapi.yaml`);
const ruleset = resolve(process.argv[3] ?? `${root}.spectral.yaml`);
const baselineFile = resolve(process.argv[4] ?? fileURLToPath(new URL("lint-baseline.json", import.meta.url)));
const bin = createRequire(import.meta.url).resolve("@stoplight/spectral-cli/dist/index.js");
const die = (msg) => {
  console.error(`spectral: ${msg}`);
  process.exit(2);
};

const r = spawnSync(process.execPath, [bin, "lint", spec, "-r", ruleset, "-f", "json", "--fail-severity", "error"], { encoding: "utf8" });
if (r.error) die(`spawn failed: ${r.error.message}`);
if (r.status !== 0 && r.status !== 1) die(`unexpected exit status ${r.status}\n${r.stdout}${r.stderr}`);
let results;
try {
  results = JSON.parse(r.stdout);
} catch {
  die(`output is not JSON\n${r.stdout}${r.stderr}`);
}
if (!Array.isArray(results)) die("output is not a result array");
const errors = results.filter((x) => x.severity === 0);
if (r.status === 1 && !errors.length) die(`exit status 1 but no error results\n${r.stderr}`);
for (const x of errors) console.log(`error ${x.code} ${x.path.join(".")}: ${x.message}`);
const others = {};
for (const x of results) if (x.severity !== 0) others[x.code] = (others[x.code] ?? 0) + 1;
const summary = Object.entries(others).map(([c, n]) => `${c}: ${n}`).join(", ");
console.log(`spectral: ${errors.length} error(s); other results: ${summary || "none"}`);

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
} catch (e) {
  die(`cannot read baseline ${baselineFile}: ${e.message}`);
}
if (!baseline || typeof baseline !== "object" || Array.isArray(baseline) || !Object.values(baseline).every((n) => Number.isInteger(n) && n >= 0)) {
  die(`baseline ${baselineFile} must be an object of non-negative integer counts per rule code`);
}
let over = 0;
for (const [code, n] of Object.entries(others)) {
  const allowed = baseline[code] ?? 0;
  if (n > allowed) {
    over++;
    console.log(`ratchet: ${code} has ${n} result(s), baseline allows ${allowed}`);
  }
}
for (const [code, allowed] of Object.entries(baseline)) {
  if ((others[code] ?? 0) < allowed) console.log(`ratchet: ${code} dropped to ${others[code] ?? 0} (baseline ${allowed}); lower the baseline in lint-baseline.json`);
}
process.exit(errors.length || over ? 1 : 0);
