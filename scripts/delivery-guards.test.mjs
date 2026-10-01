import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p) => readFileSync(path(p), 'utf8');

test('[VCK-009-AC2] turbo.json globalDependencies include out-of-package drift inputs, all existing', () => {
  const g = JSON.parse(read('turbo.json')).globalDependencies ?? [];
  for (const f of ['design-system/vn-commerce-kit/MASTER.md', 'docs/13-ux-design-and-motion.md']) {
    assert.ok(g.includes(f), `${f} missing from globalDependencies`);
  }
  for (const f of g) assert.ok(existsSync(path(f)), `${f} does not exist`);
});

test('[VCK-009-AC1] skill licence handoff: docs/12 checklist bullet and docs/09 risk row exist', () => {
  const d12 = read('docs/12-documentation-lifecycle.md');
  assert.match(d12, /Client delivery[^\n]*exclude \.claude\/skills\/ui-ux-pro-max\/[\s\S]{0,200}CC-BY-NC-4\.0/);
  const row = read('docs/09-risk-register.md').split('\n').find((l) => l.includes('ui-ux-pro-max'));
  assert.ok(row?.startsWith('| R-'), 'no risk row');
  assert.match(row, /CC-BY-NC-4\.0/);
});
