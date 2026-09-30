/* global process, URL */
// Shared helpers: build a throwaway repo tree under os.tmpdir(); never touches tracked files.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const CHECK = fileURLToPath(new URL("../check.mjs", import.meta.url));

export const bug = (n, { sev = "S2", status = "OPEN", cause = "1. Why did it break? Because X.", reg = `\`a.test.mjs::it [BUG-${n}]\`` } = {}) =>
  `# BUG-${n} title\nSeverity: ${sev} · Status: ${status}\nFound: 2026-10-01 · by PLAT · via test · Release affected: unreleased\n\n## Reproduction\n1. x\n\n## Root cause (5 whys)\n${cause}\n\n## Regression test\n${reg}\n`;

export const progress = (n = 3) =>
  `# PROGRESS\nintro\n\n## Now\n${Array.from({ length: n }, (_, i) => `- line ${i + 1}`).join("\n")}\n\n## Log\nold\n`;

/** files: { "docs/bugs/BUG-001-x.md": "..." }; returns the temp root (caller removes with rmSync). */
export function makeRoot(files) {
  const root = mkdtempSync(join(tmpdir(), "docs-check-"));
  for (const [rel, body] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, body);
  }
  return root;
}

export const cleanup = (root) => rmSync(root, { recursive: true, force: true });

export const baseFiles = () => ({
  "docs/bugs/BUG-000-template.md": "# BUG-<nnn> <short title>\nSeverity: S1 | S2 | S3 | S4 · Status: OPEN | INVESTIGATING\n",
  "docs/bugs/BUG-001-open.md": bug("001"),
  "docs/progress/PROGRESS.md": progress(),
});

export function runCheck(root) {
  const r = spawnSync(process.execPath, [CHECK], { env: { ...process.env, VCK_ROOT: root }, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
