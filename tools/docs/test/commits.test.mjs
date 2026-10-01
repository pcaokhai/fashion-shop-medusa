import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCommit, groupCommits } from "../lib/commits.mjs";

const ok = (s, b = "") => {
  const c = parseCommit(s, b);
  assert.equal(c.nonConforming, undefined, `expected conforming: ${s}`);
  return c;
};

test("[VCK-008-AC2] feat and fix with scope, story and PR", () => {
  const f = ok("feat(storefront): add cart drawer (VCK-203)");
  assert.deepEqual([f.type, f.scope, f.breaking, f.story, f.pr, f.description], ["feat", "storefront", false, "VCK-203", null, "add cart drawer"]);
  const g = ok("fix: stop double submit (VCK-204) (#7)");
  assert.deepEqual([g.type, g.scope, g.story, g.pr, g.description], ["fix", null, "VCK-204", "7", "stop double submit"]);
  const h = ok("perf: faster list (#7)");
  assert.deepEqual([h.story, h.pr, h.description], [null, "7", "faster list"]);
  const n = ok("chore: plain");
  assert.deepEqual([n.story, n.pr], [null, null]);
});

test("[VCK-008-AC2] breaking via ! and via BREAKING CHANGE footer only", () => {
  assert.equal(ok("feat!: drop v1").breaking, true);
  assert.equal(ok("feat(api)!: drop v1").breaking, true);
  assert.equal(ok("feat: x", "text\n\nBREAKING CHANGE: gone\r\n").breaking, true);
  assert.equal(ok("feat: x", "mentions BREAKING CHANGE: inline only").breaking, false);
  assert.equal(ok("feat: x", "body").breaking, false);
});

test("[VCK-008-AC2] BUG ids come from subject and body, deduped", () => {
  assert.deepEqual(ok("fix: crash [BUG-001]", "also BUG-002 and BUG-001 again").bugIds, ["BUG-001", "BUG-002"]);
  assert.deepEqual(ok("fix: nothing").bugIds, []);
  assert.deepEqual(ok("fix: x", "BUG-12 BUG-1234x").bugIds, []);
});

test("[VCK-008-AC2] non-conforming subjects (unknown type, wip, merge, missing colon)", () => {
  for (const s of ["wip: stuff", "Merge branch 'x'", "feat add thing", "feat:no space", "feat: ", "Feat: x", ""]) {
    const c = parseCommit(s, "");
    assert.equal(c.nonConforming, true, s);
    assert.equal(typeof c.subject, "string");
  }
});

test("[VCK-008-AC2] BOM, CRLF, C0 and NUL subjects are cleaned", () => {
  assert.equal(ok("\uFEFFfeat: a\r\u0000b\u0007c\t d\r\n").description, "a bc d");
  const c = parseCommit("wip:\u0000 x\u001b[31m", "");
  assert.equal(c.nonConforming, true);
  // eslint-disable-next-line no-control-regex
  assert.ok(!/[\u0000-\u001f]/.test(c.subject));
});

test("[VCK-008-AC2] a 10 000-char subject is capped", () => {
  const c = ok(`feat: ${"a".repeat(10000)}`);
  assert.equal(c.description.length, 201);
  assert.ok(c.description.endsWith("…"));
  assert.ok(parseCommit(`wip: ${"b".repeat(10000)}`, "").subject.length <= 201);
});

test("[VCK-008-AC2] groupCommits splits features, bugs, changed, omitted, non-conforming, breaking", () => {
  const cs = [
    ok("feat: a"), ok("feat!: b"), ok("fix: c [BUG-001]"), ok("perf: d"), ok("refactor: e"),
    ok("docs: f"), ok("docs: g"), ok("chore: h"), ok("ci: i"), ok("test: j"), parseCommit("wip: k", ""),
  ];
  const g = groupCommits(cs);
  assert.deepEqual(g.features.map((c) => c.description), ["a", "b"]);
  assert.deepEqual(g.bugs.map((c) => c.description), ["c [BUG-001]"]);
  assert.deepEqual(g.changed.map((c) => c.description), ["d", "e"]);
  assert.deepEqual(g.omittedCounts, { docs: 2, test: 1, chore: 1, ci: 1 });
  assert.equal(g.nonConforming.length, 1);
  assert.deepEqual(g.breaking.map((c) => c.description), ["b"]);
  assert.ok(g.features.length > 0 && g.changed.length > 0);
});
