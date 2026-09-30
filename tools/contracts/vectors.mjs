/* global process, console, URL */
// Regenerates contracts/vnpay/golden-vectors.json (the generator writes it in place) and fails on any diff.
// Usage: node vectors.mjs [compare-file]
//   default: `git diff --exit-code` on the tracked golden file. With compare-file: diff regenerated vs that file (tests).
import { spawnSync } from "node:child_process";

const root = new URL("../../", import.meta.url).pathname;
const golden = "contracts/vnpay/golden-vectors.json";
const sh = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: "inherit" });

if (spawnSync("python3", ["--version"]).error) {
  console.error("python3 is required to regenerate VNPay golden vectors (docs/03 §3); install Python 3 and retry");
  process.exit(1);
}
if (sh("python3", ["contracts/vnpay/generate_vectors.py"]).status !== 0) process.exit(1);
const other = process.argv[2];
const d = other ? sh("git", ["diff", "--no-index", "--exit-code", "--", golden, other]) : sh("git", ["diff", "--exit-code", "--", golden]);
if (d.status !== 0) console.error("golden-vectors.json differs from the generator output");
process.exit(d.status === 0 ? 0 : 1);
