// Deterministic tree hash of the vendored ui-ux-pro-max skill:
// sha256 over sorted `posix/path\0` + file bytes. Fails closed on missing/empty dirs.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const list = (dir, rel = '') =>
  readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const p = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? list(dir, p) : [p];
  });

export function hashTree(dir) {
  const files = list(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (files.length === 0) throw new Error(`empty tree: ${dir}`);
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
