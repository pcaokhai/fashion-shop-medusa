/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBugs } from "../lib/bug.mjs";
import { checkProgress } from "../lib/progress.mjs";
import { main } from "../check.mjs";
import { bug, progress, makeRoot, cleanup, baseFiles, runCheck, CHECK } from "./fixture.mjs";
import { spawnSync } from "node:child_process";

const bugs = (files) => {
  const root = makeRoot({ "docs/bugs/BUG-000-template.md": "t", ...files });
  try {
    return checkBugs(root).violations;
  } finally {
    cleanup(root);
  }
};
const one = (body, name = "BUG-001-x.md") => bugs({ [`docs/bugs/${name}`]: body });
const prog = (body) => {
  const root = makeRoot({ "docs/progress/PROGRESS.md": body });
  try {
    return checkProgress(root).violations;
  } finally {
    cleanup(root);
  }
};
const closed = (over) => bug("001", { status: "CLOSED", ...over });
const hdr = "# BUG-001 t\nSeverity: S2 · Status: CLOSED\n";

// item 1: fences
test("[VCK-008-AC1] headings only inside a fence do not count (``` and ~~~)", () => {
  for (const f of ["```", "~~~", "  ```", "````"]) {
    const md = `${hdr}\n## Evidence\n${f}\n## Root cause (5 whys)\n1. real\n## Regression test\n[BUG-001]\n${f}\n`;
    assert.ok(one(md).length >= 1, f);
  }
});
test("[VCK-008-AC1] a '## ' line inside a fence does not end the Regression section", () => {
  const md = `${hdr}\n## Root cause (5 whys)\n1. real cause\n\n## Regression test\n\`\`\`\n## x\n[BUG-001]\n\`\`\`\n`;
  assert.deepEqual(one(md), []);
});
test("[VCK-008-AC1] a shorter or different closing fence does not close", () => {
  const md = `${hdr}\n## Root cause (5 whys)\n1. real\n## Evidence\n\`\`\`\`\n\`\`\`\n~~~\n## Regression test\n[BUG-001]\n`;
  assert.match(one(md).join(), /unterminated/);
});
test("[VCK-008-AC1] unterminated fence is a violation (bug and PROGRESS)", () => {
  assert.match(one(`${closed({})}\n\`\`\`\nx\n`).join(), /unterminated/);
  assert.match(prog("# P\n## Now\n- a\n```\n- b\n").join(), /unterminated/);
});
test("[VCK-008-AC3] '## Now' only inside a fence fails; '##' inside fence within Now does not end it", () => {
  assert.equal(prog("# P\n```\n## Now\n- a\n```\n").length, 1);
  const inner = Array.from({ length: 18 }, (_, i) => `- l${i}`).join("\n");
  assert.match(prog(`# P\n## Now\n\`\`\`\n## x\n${inner}\n\`\`\`\n## Log\n`).join(), /\b2\d lines/);
});

// item 2: header scoping
test("[VCK-008-AC1] Severity/Status outside the header line never satisfy", () => {
  const body = "## Reproduction\n1. x\n";
  for (const md of [
    `# BUG-001 t\nFound: x\nSeverity: S2 · Status: OPEN\n${body}`,
    `# BUG-001 t\n\n${body}Severity: S2 · Status: OPEN\n`,
    `# BUG-001 t\nnothing\n\`\`\`\nSeverity: S2 · Status: OPEN\n\`\`\`\n`,
    `# BUG-001 t\nSeverity: S2\n\nStatus: OPEN\n`,
  ])
    assert.ok(one(md).length >= 1, md);
});
test("[VCK-008-AC1] duplicate or second header fails; missing title / empty file fails", () => {
  assert.ok(one("# BUG-001 t\nSeverity: S2 · Status: OPEN · Status: CLOSED\n").length >= 1);
  assert.ok(one("# BUG-001 t\nSeverity: S2 · Severity: S1 · Status: OPEN\n").length >= 1);
  assert.ok(one("# BUG-001 t\nSeverity: S2 · Status: OPEN\nSeverity: S1 · Status: OPEN\n").length >= 1);
  assert.ok(one("Severity: S2 · Status: OPEN\n").length >= 1);
  assert.ok(one("").length >= 1);
});
test("[VCK-008-AC1] unfilled template header line fails", () => {
  assert.ok(one("# BUG-001 t\nSeverity: S1 | S2 | S3 | S4 · Status: OPEN | INVESTIGATING | FIXED | VERIFIED | CLOSED\n").length >= 1);
});
test("[VCK-008-AC1] lowercase severity/status fails", () => {
  assert.ok(one(bug("001").replace("Status: OPEN", "Status: open")).length >= 1);
  assert.ok(one(bug("001").replace("Severity: S2", "severity: s2")).length >= 1);
});

// item 3: comments
test("[VCK-008-AC1] comment-only / bare-number / whitespace root cause is empty", () => {
  for (const cause of ["<!-- todo -->", "1.", "1. ", "   ", "<!--\nmulti\nline\n-->\n2."]) assert.match(one(closed({ cause })).join(), /Root cause/, JSON.stringify(cause));
});
test("[VCK-008-AC1] token only in an HTML comment, or only in ## Fix, or other number fails", () => {
  assert.ok(one(closed({ reg: "<!-- [BUG-001] -->" })).length >= 1);
  assert.ok(one(`${closed({ reg: "none" })}\n## Fix\n[BUG-001]\n`).length >= 1);
  assert.deepEqual(one(closed({ cause: "<!-- c -->\n1. real" })), []);
});

// item 4/5: names, CRLF, template
test("[VCK-008-AC1] BUG-000-other.md is an ordinary bug; only the exact template name is skipped", () => {
  assert.ok(bugs({ "docs/bugs/BUG-000-other.md": "junk" }).length >= 1);
  assert.deepEqual(bugs({ "docs/bugs/BUG-000-template.md": "junk" }), []);
  assert.ok(bugs({ "docs/bugs/BUG-000-templatex.md": "junk" }).length >= 1);
});
test("[VCK-008-AC1] case-variant names fail; README, non-bug files and *.md.bak are ignored", () => {
  for (const n of ["bug-002-x.md", "BUG-002-x.MD", "Bug-002-x.md"]) assert.match(bugs({ [`docs/bugs/${n}`]: bug("002") }).join(), /bad file name/, n);
  assert.deepEqual(bugs({ "docs/bugs/README.md": "x", "docs/bugs/notes.md": "x", "docs/bugs/BUG-002-x.md.bak": "x" }), []);
});
test("[VCK-008-AC1] CRLF fixtures pass and fail correctly", () => {
  const crlf = (s) => s.replace(/\n/g, "\r\n");
  assert.deepEqual(one(crlf(closed({}))), []);
  assert.ok(one(crlf(closed({ cause: "" }))).length >= 1);
  assert.ok(one(crlf(bug("001", { sev: "S9" }))).length >= 1);
  assert.deepEqual(prog(crlf(progress(15))), []);
  assert.equal(prog(crlf(progress(16))).length, 1);
});

// check.mjs
test("[VCK-008-AC1] a throwing check is reported and main returns 1", () => {
  const err = [];
  const code = main({ VCK_ROOT: "/x" }, [{ name: "boom", run: () => { throw new Error("kaput"); } }], { log: () => {}, error: (m) => err.push(m) });
  assert.equal(code, 1);
  assert.match(err.join("\n"), /boom: check crashed \(kaput\)/);
});
test("[VCK-008-AC1] VCK_ROOT set but empty fails closed; unset uses the repo root", () => {
  const r = spawnSync(process.execPath, [CHECK], { env: { ...process.env, VCK_ROOT: "" }, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /VCK_ROOT is set but empty/);
  const env = { ...process.env };
  delete env.VCK_ROOT;
  assert.equal(spawnSync(process.execPath, [CHECK], { env, encoding: "utf8" }).status, 0);
});
test("[VCK-008-AC1] sanity: base fixture still passes through the CLI", () => {
  const root = makeRoot(baseFiles());
  try {
    assert.equal(runCheck(root).code, 0);
  } finally {
    cleanup(root);
  }
});
