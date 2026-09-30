import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashTree } from './ui-skill-hash.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKILL = join(ROOT, '.claude/skills/ui-ux-pro-max');
const ADR = readFileSync(join(ROOT, 'docs/adr/ADR-013-design-system-and-motion.md'), 'utf8');
const PY_ENV = { ...process.env, PYTHONDONTWRITEBYTECODE: '1' };

const GIT_ENV = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' };
const git = (cwd, ...args) => {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, env: GIT_ENV, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
};
const tempDir = (t) => {
  const d = mkdtempSync(join(tmpdir(), 'ui-skill-'));
  t.after(() => rmSync(d, { recursive: true, force: true }));
  return d;
};

// Text of the `## Decision` section only (up to the next `## ` heading).
export const decisionSection = (md) => md.match(/^## Decision\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? '';

// Python: every import (nested/conditional too, via ast.walk) must be stdlib or a sibling skill module.
const PY_CHECK = `
import ast, pathlib, sys, json
bad, seen = [], []
files = sorted(pathlib.Path(sys.argv[1]).glob("*.py"))
siblings = {p.stem for p in files}
for p in files:
    seen.append(p.name)
    for n in ast.walk(ast.parse(p.read_text(encoding="utf8"))):
        names = [a.name for a in n.names] if isinstance(n, ast.Import) else (
            [n.module] if isinstance(n, ast.ImportFrom) and n.level == 0 and n.module else [])
        bad += [f"{p.name}:{m}" for m in names if m.split(".")[0] not in sys.stdlib_module_names | siblings]
print(json.dumps({"seen": seen, "bad": bad}))`;
const pyImports = (dir) => {
  const r = spawnSync('python3', ['-c', PY_CHECK, dir], { env: PY_ENV, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

test('[VCK-009-AC1] ADR-013 pins ui-ux-pro-max-cli@2.15.0 and the skill tree hash', () => {
  const decision = decisionSection(ADR);
  assert.ok(decision.includes('ui-ux-pro-max-cli@2.15.0'));
  const pinned = decision.match(/sha256:[0-9a-f]{64}/)?.[0];
  assert.ok(pinned, 'ADR-013 has no sha256 tree hash');
  assert.equal(hashTree(SKILL), pinned);
});

test('[VCK-009-AC1] tree hash is sensitive to one byte and fails closed', (t) => {
  const tmp = tempDir(t);
  const repo = join(tmp, 'repo');
  const copy = join(repo, 'skill');
  mkdirSync(repo);
  cpSync(SKILL, copy, { recursive: true });
  git(repo, 'init', '-q');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'x');
  assert.equal(hashTree(copy), hashTree(SKILL));
  const file = join(copy, 'SKILL.md');
  const bytes = readFileSync(file);
  bytes[0] ^= 1;
  writeFileSync(file, bytes);
  assert.notEqual(hashTree(copy), hashTree(SKILL)); // tracked modification
  assert.throws(() => hashTree(join(tmp, 'missing')));
  assert.throws(() => hashTree(tmp)); // not a git repo
  const empty = join(repo, 'empty');
  mkdirSync(empty);
  assert.throws(() => hashTree(empty)); // no tracked files
  rmSync(file);
  assert.throws(() => hashTree(copy)); // tracked file missing
});

test('[VCK-009-AC1] untracked files in the real skill dir do not change the hash', (t) => {
  const junk = join(SKILL, '.DS_Store.vck-test');
  writeFileSync(junk, 'junk');
  t.after(() => rmSync(junk, { force: true }));
  assert.equal(hashTree(SKILL), ADR.match(/sha256:[0-9a-f]{64}/)[0]);
});

test('[VCK-009-AC1] ADR pin outside the Decision section does not count', () => {
  const md = '# A\n\n## Context\nui-ux-pro-max-cli@2.15.0 sha256:' + 'a'.repeat(64) + '\n## Decision\nnothing\n## Consequences\nx\n';
  assert.equal(decisionSection(md), 'nothing\n');
  assert.ok(!decisionSection(md).includes('ui-ux-pro-max-cli@2.15.0'));
});

test('[VCK-009-AC1] nested non-stdlib python import is caught', (t) => {
  const tmp = tempDir(t);
  writeFileSync(join(tmp, 'a.py'), 'import os\ntry:\n    import yaml\nexcept ImportError:\n    pass\n');
  assert.deepEqual(pyImports(tmp).bad, ['a.py:yaml']);
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

test('[VCK-009-AC1] every import in skill scripts/*.py is stdlib or a sibling module', () => {
  const { seen, bad } = pyImports(join(SKILL, 'scripts'));
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
