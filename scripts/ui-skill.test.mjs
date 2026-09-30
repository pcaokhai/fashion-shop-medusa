import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashTree } from './ui-skill-hash.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKILL = join(ROOT, '.claude/skills/ui-ux-pro-max');
const ADR = readFileSync(join(ROOT, 'docs/adr/ADR-013-design-system-and-motion.md'), 'utf8');
const PY_ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

test('[VCK-009-AC1] ADR-013 pins ui-ux-pro-max-cli@2.15.0 and the skill tree hash', () => {
  assert.ok(ADR.includes('ui-ux-pro-max-cli@2.15.0'));
  const pinned = ADR.match(/sha256:[0-9a-f]{64}/)?.[0];
  assert.ok(pinned, 'ADR-013 has no sha256 tree hash');
  assert.equal(hashTree(SKILL), pinned);
});

test('[VCK-009-AC1] tree hash is sensitive to one byte and fails closed', (t) => {
  const tmp = mkdtempSync(join(tmpdir(), 'ui-skill-'));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  const copy = join(tmp, 'skill');
  cpSync(SKILL, copy, { recursive: true });
  assert.equal(hashTree(copy), hashTree(SKILL));
  const file = join(copy, 'SKILL.md');
  const bytes = readFileSync(file);
  bytes[0] ^= 1;
  writeFileSync(file, bytes);
  assert.notEqual(hashTree(copy), hashTree(SKILL));
  assert.throws(() => hashTree(join(tmp, 'missing')));
});

test('[VCK-009-AC1] search.py runs offline with stdlib only and writes no bytecode', () => {
  const r = spawnSync(
    'python3',
    [join(SKILL, 'scripts/search.py'), 'vietnamese ecommerce', '--domain', 'typography'],
    { env: PY_ENV, encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Be Vietnam Pro/);
  assert.deepEqual(walk(SKILL).filter((f) => f.includes('__pycache__')), []);
});

test('[VCK-009-AC1] every top-level import in skill scripts/*.py is stdlib', () => {
  const code = `
import ast, pathlib, sys, json
bad, seen = [], []
files = sorted(pathlib.Path(sys.argv[1]).glob("*.py"))
siblings = {p.stem for p in files}
for p in files:
    seen.append(p.name)
    for n in ast.parse(p.read_text(encoding="utf8")).body:
        names = [a.name for a in n.names] if isinstance(n, ast.Import) else (
            [n.module] if isinstance(n, ast.ImportFrom) and n.level == 0 else [])
        bad += [f"{p.name}:{m}" for m in names if m.split(".")[0] not in sys.stdlib_module_names | siblings]
print(json.dumps({"seen": seen, "bad": bad}))`;
  const r = spawnSync('python3', ['-c', code, join(SKILL, 'scripts')], { env: PY_ENV, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const { seen, bad } = JSON.parse(r.stdout);
  assert.ok(seen.length > 0, 'no scripts inspected');
  assert.deepEqual(bad, []);
});

test('[VCK-009-AC1] settings.json keeps data/** and scripts/tests/** Read-denied; no __pycache__ tracked', () => {
  const deny = JSON.parse(readFileSync(join(ROOT, '.claude/settings.json'), 'utf8')).permissions.deny;
  for (const d of ['data', 'scripts/tests']) {
    assert.ok(deny.includes(`Read(./.claude/skills/ui-ux-pro-max/${d}/**)`), d);
  }
  const files = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).stdout;
  assert.ok(!files.includes('__pycache__'));
  assert.ok(readFileSync(join(ROOT, '.gitignore'), 'utf8').split('\n').includes('__pycache__/'));
  assert.ok(existsSync(SKILL));
});
