/* global process, console, URL */
// Drift gate (AC4): after generation, ANY tracked or untracked change under apps/*/src/generated/** or in the
// VNPay golden vectors means someone forgot to run `make contracts` and commit. Exit 1 = drift, 2 = git failed (fail closed).
// Caveat: ignored or info/exclude'd untracked files are invisible to git status; if .gitignore ever covers generated paths this gate stops seeing them.
// VCK_ROOT overrides the repo root (tests use a temp git repo).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = process.env.VCK_ROOT ?? fileURLToPath(new URL("../../", import.meta.url));
const paths = ["apps/*/src/generated/*", "contracts/vnpay/golden-vectors.json"];
const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });

const st = git("status", "--porcelain", "--untracked-files=all", "--", ...paths);
if (st.error || st.status !== 0) {
  console.error(`check-generated: git status failed (${st.error?.message ?? `exit ${st.status}`})\n${st.stderr ?? ""}`);
  process.exit(2);
}
if (!st.stdout.trim()) {
  console.log("check-generated: generated output is up to date");
  process.exit(0);
}
console.error(`::error::generated output drifted from the committed files:\n${st.stdout}`);
const diff = git("diff", "HEAD", "--stat", "--", ...paths);
if (diff.stdout) console.error(diff.stdout);
console.error("Fix: run `make contracts` and commit the result (never hand-edit generated files).");
process.exit(1);
