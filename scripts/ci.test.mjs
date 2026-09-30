import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  assert.ok(s.run.includes('out=$(pnpm licenses list --prod --json) || [ "$out" = "No licenses in packages found" ]'));
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

// Required status checks (branch protection, when available): checks, integration, security, pins, pr-title.
// A skipped job counts as passing, so no job may carry an `if:`; job ids and concurrency prefixes must not collide.
test('[VCK-003-AC1] required-check safety: exact job ids, no job-level if, unique ids and group prefixes', () => {
  assert.deepEqual(Object.keys(load('ci.yml').jobs).sort(), ['checks', 'integration', 'pins', 'security']);
  assert.deepEqual(Object.keys(load('pr-title.yml').jobs), ['pr-title']);
  const ids = files.flatMap((f) => Object.keys(load(f).jobs));
  assert.equal(new Set(ids).size, ids.length, 'job ids must be unique across workflows');
  for (const f of files) {
    for (const [n, j] of Object.entries(load(f).jobs)) assert.equal(j.if, undefined, `${f}:${n} has a job-level if`);
  }
  const prefixes = files.map((f) => load(f).concurrency.group.split('${{')[0]);
  assert.equal(new Set(prefixes).size, prefixes.length, `group prefixes collide: ${prefixes}`);
});

test('[VCK-003-AC1] runners are pinned: no ubuntu-latest, ubuntu-24.04 everywhere', () => {
  for (const f of files) {
    assert.ok(!raw(f).includes('ubuntu-latest'), `${f} uses ubuntu-latest`);
    for (const [n, j] of Object.entries(load(f).jobs)) assert.equal(j['runs-on'], 'ubuntu-24.04', `${f}:${n}`);
  }
});

test('[VCK-003-AC2] every checkout sets persist-credentials: false', () => {
  for (const f of files) {
    for (const s of steps(load(f)).filter((x) => x.uses?.startsWith('actions/checkout@'))) {
      assert.equal(s.with?.['persist-credentials'], false, `${f}: checkout keeps credentials`);
    }
  }
});

test('[VCK-004-AC2] contract-breaking.yml: triggers, distinct group prefix, job id breaking', () => {
  assert.ok(files.includes('contract-breaking.yml'));
  const wf = load('contract-breaking.yml');
  assert.deepEqual(wf.on.pull_request.types, ['opened', 'synchronize', 'reopened', 'labeled', 'unlabeled', 'edited']);
  assert.ok(wf.concurrency.group.startsWith('contract-breaking-${{ github.event.pull_request.number }}'));
  assert.deepEqual(Object.keys(wf.jobs), ['breaking']);
  for (const f of ['ci.yml', 'pr-title.yml']) assert.notEqual(load(f).concurrency.group.split('${{')[0], 'contract-breaking-');
});

test('[VCK-004-AC2] contract-breaking.yml: oasdiff checksum literal verified before tar; PR text only via env', () => {
  const wf = load('contract-breaking.yml');
  const install = wf.jobs.breaking.steps.find((s) => /oasdiff/.test(s.name ?? '') && s.run);
  assert.ok(install, 'install step missing');
  assert.match(install.run, /echo "[0-9a-f]{64} {2}oasdiff_[\d.]+_linux_amd64\.tar\.gz"/);
  const i = install.run.indexOf('sha256sum -c');
  assert.ok(i >= 0 && i < install.run.indexOf('tar '), 'sha256sum -c must precede tar');
  const gate = wf.jobs.breaking.steps.find((s) => /breaking\.mjs/.test(s.run ?? ''));
  assert.match(gate.env.PR_BODY, /github\.event\.pull_request\.body/);
  assert.match(gate.env.PR_LABELS, /toJson\(github\.event\.pull_request\.labels\.\*\.name\)/);
  for (const f of files) for (const r of runs(load(f))) assert.ok(!r.includes('${{'), `${f}: expression inside run`);
});

test('[VCK-004-AC2] contract-breaking.yml: missing baseline on origin/main skips cleanly (exit 0)', () => {
  const gate = load('contract-breaking.yml').jobs.breaking.steps.find((s) => /breaking\.mjs/.test(s.run ?? ''));
  const d = mkdtempSync(join(tmpdir(), 'vck-ci-'));
  try {
    const sh = (c) => spawnSync('bash', ['-ec', c], { cwd: d, encoding: 'utf8', env: { ...process.env, RUNNER_TEMP: d } });
    sh('git init -q && git -c user.name=t -c user.email=t@t commit -q --allow-empty -m x && git update-ref refs/remotes/origin/main HEAD');
    const r = sh(gate.run);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /no baseline/);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});
