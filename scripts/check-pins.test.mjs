import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUses, verifyPin } from './check-action-pins.mjs';

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);
const line = (r) => `steps:\n  - uses: ${r}\n`;

test('[VCK-003-AC2] parseUses reads owner/repo[/path], sha, tag, line', () => {
  const { pins, violations } = parseUses(`x:\n  - uses: actions/checkout@${SHA} # v7.0.1\n  - uses: o/r/sub/dir@${SHA} # v1.2.3\n`);
  assert.deepEqual(violations, []);
  assert.deepEqual(pins, [
    { ownerRepo: 'actions/checkout', sha: SHA, tag: 'v7.0.1', line: 2 },
    { ownerRepo: 'o/r', sha: SHA, tag: 'v1.2.3', line: 3 },
  ]);
});

test('[VCK-003-AC2] parseUses flags missing comment, non-40-hex ref, docker://', () => {
  for (const r of [`o/r@${SHA}`, `o/r@v4 # v4.0.0`, `o/r@${SHA.slice(1)} # v1.0.0`, 'docker://alpine:3 # v1.0.0']) {
    assert.equal(parseUses(line(r)).violations.length, 1, r);
  }
});

test('[VCK-003-AC2] parseUses ignores local ./ actions', () => {
  const r = parseUses(line('./.github/actions/x'));
  assert.deepEqual(r, { pins: [], violations: [] });
});

const pin = { ownerRepo: 'o/r', sha: SHA, tag: 'v1.0.0', line: 2 };

test('[VCK-003-AC2] verifyPin passes when tag resolves to the pinned commit', async () => {
  assert.equal(await verifyPin(pin, async () => SHA), null);
});

test('[VCK-003-AC2] verifyPin fails on mismatch (also a tag-object sha)', async () => {
  assert.match(await verifyPin(pin, async () => OTHER), /o\/r@v1\.0\.0/);
});

test('[VCK-003-AC2] verifyPin fails closed when the resolver rejects', async () => {
  assert.match(await verifyPin(pin, async () => { throw new Error('boom'); }), /boom/);
});
