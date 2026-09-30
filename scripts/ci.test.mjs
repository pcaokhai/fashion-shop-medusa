import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';

const dir = new URL('../.github/workflows/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.yml'));
const raw = (f) => readFileSync(new URL(f, dir), 'utf8');
const load = (f) => parse(raw(f));
const steps = (wf) => Object.values(wf.jobs).flatMap((j) => j.steps ?? []);
const runs = (wf) => steps(wf).map((s) => s.run ?? '');
const uses = (wf) => steps(wf).filter((s) => s.uses);

test('[VCK-003-AC1] at least ci.yml exists', () => {
  assert.ok(files.includes('ci.yml'));
});

test('[VCK-003-AC1] ci.yml triggers on pull_request without edited (would cancel real runs)', () => {
  const types = load('ci.yml').on.pull_request.types;
  assert.deepEqual(types, ['opened', 'synchronize', 'reopened']);
  assert.ok(!types.includes('edited'));
});

test('[VCK-003-AC1] a job runs turbo affected lint typecheck test with fetch-depth 0', () => {
  const wf = load('ci.yml');
  const job = Object.values(wf.jobs).find((j) =>
    j.steps.some((s) => /pnpm turbo run lint typecheck test\b/.test(s.run ?? '') && /--filter='?\.\.\.\[origin\/main\]/.test(s.run)),
  );
  assert.ok(job, 'affected turbo step missing');
});

test('[VCK-003-AC1] every job that references origin/main checks out with fetch-depth 0', () => {
  const jobs = Object.entries(load('ci.yml').jobs).filter(([, j]) => j.steps.some((s) => (s.run ?? '').includes('origin/main')));
  assert.ok(jobs.length >= 2, 'expected checks and integration');
  for (const [name, j] of jobs) {
    const co = j.steps.find((s) => s.uses?.startsWith('actions/checkout@'));
    assert.equal(co.with['fetch-depth'], 0, `${name} needs fetch-depth: 0`);
  }
});

test('[VCK-003-AC1] a step runs the scripts tests', () => {
  assert.ok(runs(load('ci.yml')).some((r) => r.includes('node --test scripts/*.test.mjs')));
});

test('[VCK-003-AC1] integration job runs make up, turbo test:integration, make down v=1 always', () => {
  const j = load('ci.yml').jobs.integration;
  assert.ok(j.steps.some((s) => s.run?.includes('make up')));
  assert.ok(j.steps.some((s) => /pnpm turbo run test:integration --filter='?\.\.\.\[origin\/main\]/.test(s.run ?? '')));
  const down = j.steps.find((s) => s.run?.includes('make down v=1'));
  assert.equal(down.if, 'always()');
});

test('[VCK-003-AC1] Node 20 and pnpm version come from packageManager', () => {
  const wf = load('ci.yml');
  const all = steps(wf);
  const node = all.find((s) => s.uses?.startsWith('actions/setup-node@'));
  assert.equal(String(node.with['node-version']), '20');
  assert.equal(node.with.cache, 'pnpm');
  for (const s of all.filter((s) => s.uses?.startsWith('pnpm/action-setup@'))) {
    assert.equal(s.with?.version, undefined, 'pnpm version must not be hard-coded');
  }
});

for (const f of files) {
  test(`[VCK-003-AC1] ${f}: permissions are exactly contents: read`, () => {
    assert.deepEqual(load(f).permissions, { contents: 'read' });
  });

  test(`[VCK-003-AC1] ${f}: every job has timeout-minutes`, () => {
    for (const [name, j] of Object.entries(load(f).jobs)) {
      assert.ok(Number.isInteger(j['timeout-minutes']), `${name} lacks timeout-minutes`);
    }
  });

  test(`[VCK-003-AC1] ${f}: cancel-in-progress with per-PR group`, () => {
    const c = load(f).concurrency;
    assert.equal(c['cancel-in-progress'], true);
    assert.match(c.group, /github\.(ref|head_ref|event\.pull_request\.number)/);
  });

  test(`[VCK-003-AC1] ${f}: every uses is SHA-pinned with a version comment [R-003-6]`, () => {
    for (const s of uses(load(f))) {
      assert.match(s.uses, /^[\w.-]+\/[\w.-]+(\/[\w./-]+)?@[0-9a-f]{40}$/, s.uses);
    }
    for (const line of raw(f).split('\n').filter((l) => /^\s*-?\s*uses:/.test(l))) {
      assert.match(line, /#\s*v\d+\.\d+\.\d+\s*$/, `missing version comment: ${line}`);
    }
  });
}
