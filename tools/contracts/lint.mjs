/* global process, console, URL */
// Usage: node lint.mjs [spec] [ruleset]  (defaults: contracts/openapi.yaml, .spectral.yaml at repo root)
// Fails closed: any spawn error, unexpected exit status, or unparseable output is a failure.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const spec = resolve(process.argv[2] ?? `${root}contracts/openapi.yaml`);
const ruleset = resolve(process.argv[3] ?? `${root}.spectral.yaml`);
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
process.exit(errors.length ? 1 : 0);
