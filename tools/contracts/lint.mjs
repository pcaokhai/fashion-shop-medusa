/* global process, console, URL */
// Usage: node lint.mjs [spec] [ruleset]  (defaults: contracts/openapi.yaml, .spectral.yaml at repo root)
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const spec = resolve(process.argv[2] ?? `${root}contracts/openapi.yaml`);
const ruleset = resolve(process.argv[3] ?? `${root}.spectral.yaml`);
const bin = createRequire(import.meta.url).resolve("@stoplight/spectral-cli/dist/index.js");

const r = spawnSync(process.execPath, [bin, "lint", spec, "-r", ruleset, "-f", "json", "--fail-severity", "error"], { encoding: "utf8" });
let results;
try {
  results = JSON.parse(r.stdout || "[]");
} catch {
  console.error(r.stdout + r.stderr);
  process.exit(2);
}
const errors = results.filter((x) => x.severity === 0);
for (const x of errors) console.log(`error ${x.code} ${x.path.join(".")}: ${x.message}`);
console.log(`spectral: ${errors.length} error(s), ${results.length - errors.length} other result(s)`);
process.exit(errors.length ? 1 : 0);
