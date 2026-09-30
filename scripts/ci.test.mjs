import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';

const dir = new URL('../.github/workflows/', import.meta.url);
const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
const raw = (f) => readFileSync(new URL(f, dir), 'utf8');
const load = (f) => parse(raw(f));
const steps = (wf) => Object.values(wf.jobs).flatMap((j) => j.steps ?? []);
const runs = (wf) => steps(wf).map((s) => s.run ?? '');
const uses = (wf) => steps(wf).filter((s) => s.uses);

test('[VCK-003-AC1] ci.yml and pr-title.yml exist (glob covers yml and yaml)', () => {
  assert.ok(files.length >= 2, `found ${files}`);
  assert.ok(files.includes('ci.yml') && files.includes('pr-title.yml'));
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

const jobRuns = (j) => (j.steps ?? []).map((s) => s.run ?? '').join('\n');

test('[VCK-003-AC2] security job: gitleaks pinned, sha256sum -c against a workflow-pinned checksum', () => {
  const j = load('ci.yml').jobs.security;
  assert.ok(j, 'security job missing');
  assert.equal(j.steps.find((s) => s.uses?.startsWith('actions/checkout@')).with['fetch-depth'], 0);
  const r = jobRuns(j);
  assert.match(r, /releases\/download\/v\d+\.\d+\.\d+\/gitleaks_\d+\.\d+\.\d+_linux_x64\.tar\.gz/);
  assert.match(r, /[0-9a-f]{64}\s+gitleaks_\S+\.tar\.gz/);
  assert.match(r, /sha256sum -c/);
  assert.ok(r.indexOf('sha256sum -c') < r.indexOf('tar '), 'verify before extract');
});

test('[VCK-003-AC2] security job: gitleaks detect --redact over the PR range', () => {
  const r = jobRuns(load('ci.yml').jobs.security);
  assert.match(r, /gitleaks detect .*--redact/);
  assert.match(r, /--log-opts="origin\/main\.\.HEAD"/);
});

test('[VCK-003-AC2] security job: pnpm audit --prod --audit-level critical', () => {
  assert.match(jobRuns(load('ci.yml').jobs.security), /pnpm audit --prod --audit-level critical/);
});

test('[VCK-003-AC2] security job: licence gate with exact shape, bash, no || true', () => {
  const j = load('ci.yml').jobs.security;
  const s = j.steps.find((x) => (x.run ?? '').includes('check-licenses.mjs'));
  assert.ok(s, 'licence step missing');
  assert.equal(s.shell, 'bash');
  assert.ok(s.run.includes('out=$(pnpm licenses list --prod --json 2>&1) || [ "$out" = "No licenses in packages found" ]'));
  assert.ok(s.run.includes("printf '%s' \"$out\" | node scripts/check-licenses.mjs"));
  assert.ok(!s.run.includes('|| true'));
  const i = j.steps.indexOf(s);
  assert.ok(j.steps.slice(0, i).some((x) => (x.run ?? '').includes('pnpm install --frozen-lockfile')));
});

test('[VCK-003-AC2] pins job runs check-action-pins with GH_TOKEN via env', () => {
  const j = load('ci.yml').jobs.pins;
  assert.ok(j, 'pins job missing');
  const s = j.steps.find((x) => (x.run ?? '').includes('node scripts/check-action-pins.mjs'));
  assert.ok(s);
  assert.equal(s.env.GH_TOKEN, '${{ github.token }}');
});

test('[VCK-003-AC3] pr-title.yml: triggers incl. edited, title via env only, runs checker', () => {
  const wf = load('pr-title.yml');
  const t = wf.on.pull_request.types;
  for (const e of ['opened', 'edited', 'synchronize', 'reopened', 'ready_for_review']) assert.ok(t.includes(e), e);
  assert.equal(Object.keys(wf.jobs).length, 1);
  const s = steps(wf).find((x) => (x.run ?? '').includes('check-pr-title.mjs'));
  assert.ok(s);
  assert.equal(s.run.trim(), 'node scripts/check-pr-title.mjs "$PR_TITLE"');
  assert.equal(s.env.PR_TITLE, '${{ github.event.pull_request.title }}');
  for (const r of runs(wf)) assert.ok(!r.includes('${{'), 'no expression interpolation in run');
});

test('[VCK-003-AC3] ci.yml has no pr-title job and no edited trigger', () => {
  const wf = load('ci.yml');
  assert.ok(!Object.keys(wf.jobs).some((n) => /title/.test(n)));
  assert.ok(!runs(wf).some((r) => r.includes('check-pr-title')));
  assert.ok(!wf.on.pull_request.types.includes('edited'));
});
