/* global process, console, URL */
// Usage: node check.mjs   (repo root override: VCK_ROOT). docs/12 §6 subset; fails closed: any violation or thrown error => exit 1.
// To add a check (Task 2): append { name, run(root) -> { violations, summary } } to CHECKS.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBugs } from "./lib/bug.mjs";
import { checkProgress, NOW_LIMIT } from "./lib/progress.mjs";

export const CHECKS = [
  { name: "bugs", run: (root) => { const r = checkBugs(root); return { violations: r.violations, summary: `${r.count} bug file(s)` }; } },
  { name: "progress", run: (root) => { const r = checkProgress(root); return { violations: r.violations, summary: `Now ${r.lines}/${NOW_LIMIT} lines` }; } },
];

export function runChecks(root, checks = CHECKS) {
  const violations = [];
  const summaries = [];
  for (const c of checks) {
    try {
      const r = c.run(root);
      violations.push(...r.violations);
      summaries.push(r.summary);
    } catch (e) {
      violations.push(`${c.name}: check crashed (${e?.message ?? e})`);
    }
  }
  return { violations, summaries };
}

/** Returns the exit code; io = { log, error }. */
export function main(env, checks = CHECKS, io = console) {
  if (env.VCK_ROOT === "") {
    io.error("docs-check: VCK_ROOT is set but empty");
    return 1;
  }
  const root = resolve(env.VCK_ROOT ?? fileURLToPath(new URL("../../", import.meta.url)));
  const { violations, summaries } = runChecks(root, checks);
  if (violations.length > 0) {
    for (const v of violations) io.error(v);
    io.error(`docs-check: FAILED (${violations.length} violation(s))`);
    return 1;
  }
  io.log(`docs-check: OK (${summaries.join("; ")})`);
  return 0;
}

// Only when run as a script (not when imported by tests).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.env));
