import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const text = (p) => readFileSync(join(root, p), 'utf8');
const wfDir = join(root, '.github/workflows');
const ci = parse(text('.github/workflows/ci.yml'));
const CMD = 'node tools/docs/check-cli.mjs';
const checks = ci.jobs.checks.steps;

test('[VCK-008-AC4] ci.yml job ids are unchanged', () => {
  assert.deepEqual(Object.keys(ci.jobs).sort(), ['checks', 'integration', 'pins', 'security']);
});

test('[VCK-008-AC4] checks job runs docs-check exactly once, after install, without escape hatches', () => {
  const hits = checks.filter((s) => s.run === CMD);
  assert.equal(hits.length, 1);
  const step = hits[0];
  assert.equal(step.name, 'Docs check');
  assert.ok(checks.indexOf(step) > checks.findIndex((s) => s.run === 'pnpm install --frozen-lockfile'));
  assert.notEqual(step['continue-on-error'], true);
  assert.equal(step.shell, undefined);
  assert.ok(!step.run.includes('${{') && !/\|\|/.test(step.run));
  assert.equal(ci.jobs.checks['continue-on-error'], undefined);
});

test('[VCK-008-AC4] nothing runs tools/docs/check.mjs (library-only: it silently does nothing)', () => {
  const all = [...readdirSync(wfDir).map((f) => `.github/workflows/${f}`), 'Makefile'];
  for (const f of all) assert.doesNotMatch(text(f), /tools\/docs\/check\.mjs/, f);
});

test('[VCK-008-AC4] Makefile: .PHONY lists docs-check and the target runs check-cli.mjs', () => {
  const mk = text('Makefile');
  assert.match(mk.match(/^\.PHONY:.*$/m)[0], /\bdocs-check\b/);
  assert.match(mk, /^docs-check:\n\t+node tools\/docs\/check-cli\.mjs$/m);
});

test('[VCK-008-AC4] PR template mentions make docs-check and docs/12; every relative link resolves', () => {
  const tpl = text('.github/pull_request_template.md');
  assert.match(tpl, /make docs-check/);
  assert.match(tpl, /docs\/12/);
  const targets = [...tpl.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]).filter((t) => !/^(https?:|#)/.test(t));
  for (const dep of ['docs/12-documentation-lifecycle.md', 'contracts/', 'docs/05-data-model.md', 'docs/adr/', 'docs/progress/PROGRESS.md', 'docs/bugs/', 'docs/releases/']) {
    assert.ok(targets.includes(dep), `link to ${dep}`);
  }
  for (const t of targets) assert.ok(existsSync(resolve(root, t)), `broken link ${t}`);
});

test('[VCK-008-AC4] real-repo smoke: check-cli.mjs exits 0 on this checkout', () => {
  const env = { ...process.env };
  delete env.VCK_ROOT;
  const ok = spawnSync(process.execPath, ['tools/docs/check-cli.mjs'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
});
