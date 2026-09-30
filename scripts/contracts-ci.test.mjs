import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('[VCK-004-AC2] contract-breaking.yml runs the real-oasdiff tests after the oasdiff install, requiring the binary', () => {
  const steps = parse(read('.github/workflows/contract-breaking.yml')).jobs.breaking.steps;
  const install = steps.findIndex((s) => /oasdiff/.test(s.name ?? '') && s.run);
  const tests = steps.findIndex((s) => (s.run ?? '').includes('node --test tools/contracts/test/breaking.test.mjs'));
  assert.ok(install >= 0 && tests > install, 'breaking tests must run after the oasdiff install step');
  assert.equal(String(steps[tests].env?.VCK_REQUIRE_OASDIFF), '1');
});

test('[VCK-004-AC2] Makefile contracts-diff hint pins the same oasdiff version as CI', () => {
  const ci = read('.github/workflows/contract-breaking.yml').match(/oasdiff\/releases\/download\/(v[\d.]+)\//)[1];
  assert.ok(read('Makefile').includes(`go install github.com/oasdiff/oasdiff@${ci}`));
});
