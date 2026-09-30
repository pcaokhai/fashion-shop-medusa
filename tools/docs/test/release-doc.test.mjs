/* global process, URL */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, symlinkSync, chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRoot, cleanup, runCheck, baseFiles } from "./fixture.mjs";
import { requiredSections } from "../lib/release-doc.mjs";

const REAL = (p) => readFileSync(fileURLToPath(new URL(`../../../${p}`, import.meta.url)), "utf8");
const TEMPLATE = REAL("docs/releases/RELEASE-template.md");
const NINE = ["Summary", "Features", "Bugs fixed", "Integration changes", "Migrations", "Metrics", "Known issues", "Upgrade and rollback", "Demo"];

const body = (h) => `Real content for ${h}.`;
/** A complete, filled-in release built from the template headings. */
const release = (skip) => `# Release 1.2.3 — x\nDate: 2026-10-02 · Tag: v1.2.3 · Sprint: 1\n\n${NINE.filter((h) => h !== skip).map((h) => `## ${h}\n${body(h)}\n`).join("\n")}`;

const idx = {
  bugs: "# Bug index\n\n| ID | Title | Severity | Status | Found in | Fixed in | Regression test |\n| --- | --- | --- | --- | --- | --- | --- |\n",
  rel: "# Releases\n\n| Version | Date | Highlights | File |\n| --- | --- | --- | --- |\n",
};
const relRow = (v = "1.2.3") => `| ${v} | 2026-10-02 | x | RELEASE-${v}.md |\n`;
const bugRow = (n = "001") => `| BUG-${n} | t | S2 | OPEN | - | - | - |\n`;

const base = () => ({
  ...baseFiles(),
  "docs/bugs/README.md": idx.bugs + bugRow(),
  "docs/releases/README.md": idx.rel,
  "docs/releases/RELEASE-template.md": TEMPLATE,
  "CHANGELOG.md": "# Changelog\n",
});
const run = (files) => {
  const root = makeRoot(files);
  try {
    return runCheck(root);
  } finally {
    cleanup(root);
  }
};
const withRel = (name, md, row = relRow()) => ({ ...base(), [`docs/releases/${name}`]: md, "docs/releases/README.md": idx.rel + row });
const fails = (r, re) => {
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, re, r.out);
};

test("[VCK-008-AC1] real template yields exactly the 9 sections of docs/12 §4 (template drift is caught)", () => {
  assert.deepEqual(requiredSections(TEMPLATE), NINE.map((h) => `## ${h}`));
});
test("[VCK-008-AC1] real repo checkout passes", () => {
  const r = runCheck(fileURLToPath(new URL("../../../", import.meta.url)));
  assert.equal(r.code, 0, r.out);
});
test("[VCK-008-AC1] zero records and empty index tables pass (explicit, today's state)", () => {
  const files = { ...base(), "docs/bugs/README.md": idx.bugs };
  delete files["docs/bugs/BUG-001-open.md"];
  const r = run(files);
  assert.equal(r.code, 0, r.out);
});
test("[VCK-008-AC1] a complete release with index row passes", () => {
  const r = run(withRel("RELEASE-1.2.3.md", release()));
  assert.equal(r.code, 0, r.out);
});

for (const h of NINE) {
  test(`[VCK-008-AC1] release missing '## ${h}' fails`, () => {
    fails(run(withRel("RELEASE-1.2.3.md", release(h))), new RegExp(`RELEASE-1\\.2\\.3\\.md: .*## ${h}`));
  });
  test(`[VCK-008-AC1] release with empty '## ${h}' (comment only) fails`, () => {
    const md = release().replace(`## ${h}\n${body(h)}\n`, `## ${h}\n<!-- todo -->\n`);
    fails(run(withRel("RELEASE-1.2.3.md", md)), new RegExp(`## ${h}.*empty`));
  });
}
test("[VCK-008-AC1] section body identical to the template's own prompt text is a placeholder (fails)", () => {
  const md = release().replace(`## Summary\n${body("Summary")}\n`, "## Summary\n<2–3 sentences: what users/staff can now do>\n");
  fails(run(withRel("RELEASE-1.2.3.md", md)), /## Summary.*placeholder|## Summary.*empty/);
});
test("[VCK-008-AC1] a section filled with 'None.' passes (non-empty rule)", () => {
  const md = release().replace(`## Known issues\n${body("Known issues")}\n`, "## Known issues\nNone.\n");
  assert.equal(run(withRel("RELEASE-1.2.3.md", md)).code, 0);
});

test("[VCK-008-AC1] hostile: CRLF + BOM + trailing spaces in headings still pass", () => {
  const md = `\uFEFF${release().replace(/^## (.*)$/gm, "## $1  ")}`.replace(/\n/g, "\r\n");
  const r = run(withRel("RELEASE-1.2.3.md", md));
  assert.equal(r.code, 0, r.out);
});
test("[VCK-008-AC1] hostile: heading inside a fence does not satisfy the section", () => {
  const md = release("Demo") + "\n```\n## Demo\nclip\n```\n";
  fails(run(withRel("RELEASE-1.2.3.md", md)), /## Demo/);
});
test("[VCK-008-AC1] hostile: heading hidden in an HTML comment does not satisfy the section", () => {
  const md = release("Demo") + "\n<!--\n## Demo\nclip\n-->\n";
  fails(run(withRel("RELEASE-1.2.3.md", md)), /## Demo/);
});
test("[VCK-008-AC1] hostile: required heading present twice fails", () => {
  fails(run(withRel("RELEASE-1.2.3.md", release() + "\n## Demo\nagain\n")), /## Demo.*2 times|## Demo.*twice|## Demo.*found 2/);
});
test("[VCK-008-AC1] hostile: wrong heading level '### Summary' fails", () => {
  fails(run(withRel("RELEASE-1.2.3.md", release().replace("## Summary", "### Summary"))), /## Summary/);
});
test("[VCK-008-AC1] hostile: heading text case 'known issues' fails", () => {
  fails(run(withRel("RELEASE-1.2.3.md", release().replace("## Known issues", "## known issues"))), /## Known issues/);
});
test("[VCK-008-AC1] hostile: unterminated fence / comment fails", () => {
  fails(run(withRel("RELEASE-1.2.3.md", release() + "\n```\nx\n")), /RELEASE-1\.2\.3\.md: unterminated code fence/);
  fails(run(withRel("RELEASE-1.2.3.md", release() + "\n<!-- x\n")), /RELEASE-1\.2\.3\.md: unterminated HTML comment/);
});
test("[VCK-008-AC1] hostile: release path that is a directory / dangling symlink / chmod 000 fails closed", (t) => {
  const root = makeRoot(base());
  t.after(() => cleanup(root));
  const dir = join(root, "docs/releases");
  writeFileSync(join(root, "docs/releases/README.md"), idx.rel + relRow("1.0.0") + relRow("1.0.1") + relRow("1.0.2"));
  mkdirSync(join(dir, "RELEASE-1.0.0.md"));
  symlinkSync(join(root, "nope"), join(dir, "RELEASE-1.0.1.md"));
  writeFileSync(join(dir, "RELEASE-1.0.2.md"), release());
  chmodSync(join(dir, "RELEASE-1.0.2.md"), 0o000);
  const r = runCheck(root);
  chmodSync(join(dir, "RELEASE-1.0.2.md"), 0o600);
  fails(r, /RELEASE-1\.0\.0\.md: cannot read/);
  assert.match(r.out, /RELEASE-1\.0\.1\.md: cannot read/);
  if (process.getuid?.() !== 0) assert.match(r.out, /RELEASE-1\.0\.2\.md: cannot read/);
});

test("[VCK-008-AC1] file name RELEASE-1.2.x.md fails; other release-* names fail; template skipped by exact name", () => {
  fails(run({ ...base(), "docs/releases/RELEASE-1.2.x.md": release() }), /RELEASE-1\.2\.x\.md: bad file name/);
  fails(run({ ...base(), "docs/releases/release-1.2.3.md": release() }), /release-1\.2\.3\.md: bad file name/);
  fails(run({ ...base(), "docs/releases/RELEASE-1.2.3-rc1.md": release() }), /bad file name/);
  assert.equal(run(base()).code, 0);
});
test("[VCK-008-AC1] a template with no '## ' headings fails closed (cannot derive sections)", () => {
  fails(run({ ...withRel("RELEASE-1.2.3.md", release()), "docs/releases/RELEASE-template.md": "# Release\nnothing\n" }), /RELEASE-template\.md: .*section/);
});

test("[VCK-008-AC1] each required file missing fails; directory / empty / dangling symlink fail closed", () => {
  const req = ["docs/bugs/README.md", "docs/releases/README.md", "docs/progress/PROGRESS.md", "CHANGELOG.md", "docs/bugs/BUG-000-template.md", "docs/releases/RELEASE-template.md"];
  for (const f of req) {
    const files = base();
    delete files[f];
    fails(run(files), new RegExp(`${f.replace(/\./g, "\\.")}: `));
  }
  fails(run({ ...base(), "CHANGELOG.md": "  \n" }), /CHANGELOG\.md: empty/);
  const root = makeRoot(base());
  try {
    cleanup(join(root, "CHANGELOG.md"));
    mkdirSync(join(root, "CHANGELOG.md"));
    fails(runCheck(root), /CHANGELOG\.md: cannot read/);
    cleanup(join(root, "CHANGELOG.md"));
    symlinkSync(join(root, "nope"), join(root, "CHANGELOG.md"));
    fails(runCheck(root), /CHANGELOG\.md: cannot read/);
  } finally {
    cleanup(root);
  }
});

test("[VCK-008-AC1] BUG file without an index row fails; index row without file fails; duplicate rows fail", () => {
  fails(run({ ...base(), "docs/bugs/README.md": idx.bugs }), /docs\/bugs\/README\.md: .*BUG-001.*no index row/);
  fails(run({ ...base(), "docs/bugs/README.md": idx.bugs + bugRow() + bugRow("007") }), /README\.md: .*BUG-007.*no file/);
  fails(run({ ...base(), "docs/bugs/README.md": idx.bugs + bugRow() + bugRow() }), /README\.md: .*duplicate.*BUG-001/);
});
test("[VCK-008-AC1] RELEASE file without an index row fails; row without file fails; duplicate rows fail", () => {
  fails(run(withRel("RELEASE-1.2.3.md", release(), "")), /releases\/README\.md: .*1\.2\.3.*no index row/);
  fails(run({ ...base(), "docs/releases/README.md": idx.rel + relRow() }), /releases\/README\.md: .*1\.2\.3.*no file/);
  fails(run(withRel("RELEASE-1.2.3.md", release(), relRow() + relRow())), /README\.md: .*duplicate.*1\.2\.3/);
});
test("[VCK-008-AC1] index template rows are not records; a link-formatted row is accepted", () => {
  const files = withRel("RELEASE-1.2.3.md", release(), "| template | - | - | RELEASE-template.md |\n| 1.2.3 | d | x | [RELEASE-1.2.3.md](RELEASE-1.2.3.md) |\n");
  files["docs/bugs/README.md"] = idx.bugs + "| BUG-000 | template | - | - | - | - | - |\n" + bugRow();
  assert.equal(run(files).code, 0);
});
test("[VCK-008-AC1] index rows inside a fence or comment are not rows", () => {
  const files = { ...base(), "docs/bugs/README.md": idx.bugs + "```\n" + bugRow() + "```\n<!--\n" + bugRow() + "-->\n" };
  fails(run(files), /BUG-001.*no index row/);
});
test("[VCK-008-AC1] hostile: index row pointing at ../../x fails and never reads outside the root", () => {
  fails(run(withRel("RELEASE-1.2.3.md", release(), "| 1.2.3 | d | x | ../../x |\n")), /releases\/README\.md: .*File cell/);
  fails(run({ ...base(), "docs/bugs/README.md": idx.bugs + bugRow() + "| ../../x | t | S2 | OPEN | - | - | - |\n" }), /bugs\/README\.md: .*malformed/);
});
test("[VCK-008-AC1] unreadable or unterminated index fails closed", () => {
  fails(run({ ...base(), "docs/bugs/README.md": idx.bugs + bugRow() + "```\n" }), /bugs\/README\.md: unterminated code fence/);
});
