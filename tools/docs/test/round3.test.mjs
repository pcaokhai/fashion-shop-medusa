import { test } from "node:test";
import assert from "node:assert/strict";
import { bug, progress, makeRoot, cleanup, baseFiles, runCheck } from "./fixture.mjs";

const run = (files) => {
  const root = makeRoot(files);
  try {
    return runCheck(root);
  } finally {
    cleanup(root);
  }
};
const count = (s, re) => (s.match(re) ?? []).length;
const bom = (s) => String.fromCharCode(0xfeff) + s;

test("[VCK-008-AC1] duplicate BUG number (two files, one index row) fails once with both names", () => {
  const f = baseFiles();
  f["docs/bugs/BUG-002-a.md"] = bug("002");
  f["docs/bugs/BUG-002-b.md"] = bug("002");
  f["docs/bugs/README.md"] += "| BUG-002 | a |\n";
  const r = run(f);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^docs\/bugs: duplicate BUG-002 \(BUG-002-a\.md, BUG-002-b\.md\)$/m);
  assert.equal(count(r.out, /duplicate BUG-002/g), 1, r.out);
});

test("[VCK-008-AC1] RELEASE names with leading zeros are bad names (strict semver, no 01.0.0 twin of 1.0.0)", () => {
  const f = baseFiles();
  f["docs/releases/RELEASE-01.0.0.md"] = "x";
  assert.match(run(f).out, /RELEASE-01\.0\.0\.md: bad file name/);
});

test("[VCK-008-AC1] a ``` fence cannot be closed by ~~~ (unterminated)", () => {
  const f = baseFiles();
  f["docs/bugs/BUG-001-open.md"] = `${bug("001")}\n\`\`\`\ncode\n~~~\n`;
  const r = run(f);
  assert.equal(r.code, 1);
  assert.match(r.out, /BUG-001-open\.md: unterminated code fence/);
});

test("[VCK-008-AC1] BOM + CRLF bug and PROGRESS files pass; BOM + bad bug still fails", () => {
  const f = baseFiles();
  f["docs/bugs/BUG-001-open.md"] = bom(bug("001", { status: "CLOSED" }).replace(/\n/g, "\r\n"));
  f["docs/progress/PROGRESS.md"] = bom(progress().replace(/\n/g, "\r\n"));
  const ok = run(f);
  assert.equal(ok.code, 0, ok.out);
  f["docs/bugs/BUG-001-open.md"] = bom(bug("001", { sev: "S9" }));
  assert.match(run(f).out, /BUG-001-open\.md: .*Severity/);
});
