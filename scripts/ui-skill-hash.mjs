// Deterministic tree hash of the vendored ui-ux-pro-max skill:
// sha256 over sorted `posix/path\0` + file bytes of git-tracked files. Fails closed on git errors, empty list, missing file.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Tracked files only (untracked junk such as .DS_Store or __pycache__ must not matter).
const list = (dir) => {
  const r = spawnSync('git', ['ls-files', '-z', '--', '.'], { cwd: dir, encoding: 'buffer' });
  if (r.error || r.status !== 0) throw new Error(`git ls-files failed in ${dir}: ${r.error ?? r.stderr}`);
  return r.stdout.toString('utf8').split('\0').filter(Boolean);
};

export function hashTree(dir) {
  const files = list(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (files.length === 0) throw new Error(`no tracked files: ${dir}`);
  const h = createHash('sha256');
  for (const f of files) {
    h.update(`${f}\0`);
    h.update(readFileSync(join(dir, f)));
  }
  return `sha256:${h.digest('hex')}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = fileURLToPath(new URL('../.claude/skills/ui-ux-pro-max', import.meta.url));
  console.log(hashTree(dir));
}
