/* global URL */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sanitize, renderRelease, insertChangelog, appendIndexRow, indexRow } from "../lib/render.mjs";
import { ReleaseError } from "../lib/errors.mjs";
import { requiredSections } from "../lib/release-doc.mjs";
import { sections, unterminated } from "../lib/sections.mjs";

const REAL = (p) => readFileSync(fileURLToPath(new URL(`../../../${p}`, import.meta.url)), "utf8");
const TEMPLATE = REAL("docs/releases/RELEASE-template.md");
const HEADS = requiredSections(TEMPLATE);
const data = (o = {}) => ({ version: "1.2.3", date: "2026-10-02", features: [], bugs: [], breaking: [], nonConforming: [], ...o });
const feat = (description, o = {}) => ({ type: "feat", story: null, pr: null, bugIds: [], description, ...o });

test("[VCK-008-AC2] sanitize neutralises table, comment, heading and fence syntax", () => {
  assert.equal(sanitize("a | b"), "a \\| b");
  assert.equal(sanitize("<!-- x -->"), "&lt;!-- x --&gt;");
  assert.equal(sanitize("## H"), "## H");
  assert.equal(sanitize("a\n## H\n```\nb"), "a ## H ''' b");
  assert.equal(sanitize("\uFEFFa\r\n\u0000b\u0007\t  c"), "a b c");
  const long = sanitize("x".repeat(500));
  assert.equal(long, `${"x".repeat(200)}…`);
  assert.ok(!/[<>`]/.test(sanitize("<a>`b`</a>")));
});

test("[VCK-008-AC2] renderRelease fills Features, Bugs, Date, Tag, breaking and keeps the rest", () => {
  const out = renderRelease(TEMPLATE, data({
    features: [feat("add cart", { story: "VCK-203", pr: "7" }), feat("no story")],
    bugs: [{ ...feat("fix crash", { pr: "9", bugIds: ["BUG-001", "BUG-002"] }), type: "fix" }, { ...feat("no id"), type: "fix" }],
    breaking: [feat("drops v1")],
  }));
  assert.match(out, /^# Release 1\.2\.3 — <name>\nDate: 2026-10-02 · Tag: v1\.2\.3 · Sprint: <n>\n/);
  assert.match(out, /\| VCK-203 \| add cart \(#7\) \| — \|\n\| — \| no story \| — \|\n/);
  assert.match(out, /\| BUG-001 \| — \| fix crash \(#9\) \|\n\| BUG-002 \| — \| fix crash \(#9\) \|\n\| — \| — \| no id \|\n/);
  assert.match(out, /## Summary\n<2–3 sentences: what users\/staff can now do>\n- BREAKING: drops v1\n/);
  for (const h of HEADS.filter((x) => x !== "## Features" && x !== "## Bugs fixed" && x !== "## Summary")) {
    assert.deepEqual(sections(out, h)[0], sections(TEMPLATE, h)[0], h);
  }
});

test("[VCK-008-AC2] empty features/bugs become None. and nothing else changes", () => {
  const out = renderRelease(TEMPLATE, data());
  assert.deepEqual(sections(out, "## Features")[0].filter((l) => l.trim()), ["None."]);
  assert.deepEqual(sections(out, "## Bugs fixed")[0].filter((l) => l.trim()), ["None."]);
  assert.deepEqual(sections(out, "## Summary")[0], sections(TEMPLATE, "## Summary")[0]);
});

test("[VCK-008-AC2] hostile subjects cannot add, drop or break template sections", () => {
  const hostile = ["## Injected", "```", "<!-- open", "-->", "| a | b |", "x\n## Known issues\n```js", "~~~", "a | b <b>", "# Title"];
  const out = renderRelease(TEMPLATE, data({
    features: hostile.map((h) => feat(h, { story: "VCK-203" })),
    bugs: hostile.map((h) => ({ ...feat(h, { bugIds: ["BUG-001"] }), type: "fix" })),
    breaking: hostile.map((h) => feat(h)),
    nonConforming: hostile.map((s) => ({ nonConforming: true, subject: s })),
  }));
  assert.ok(HEADS.length === 9);
  assert.equal(unterminated(out), null);
  assert.deepEqual(requiredSections(out), HEADS);
  for (const h of HEADS) assert.equal(sections(out, h).length, 1, h);
  assert.equal(out.split("\n").filter((l) => l.startsWith("```") || l.startsWith("~~~")).length, 0);
  assert.equal(out.split("\n").filter((l) => /^\|.*\|/.test(l) && l.includes("Injected")).length, 2);
});

test("[VCK-008-AC2] renderRelease refuses a template without sections or table", () => {
  assert.throws(() => renderRelease("# t\nno sections\n", data()), ReleaseError);
  assert.throws(() => renderRelease(TEMPLATE.replace("| Story | Title | Flag enabled |\n| --- | --- | --- |\n", ""), data({ features: [feat("a")] })), ReleaseError);
  assert.throws(() => renderRelease(TEMPLATE, data({ version: "1.2" })), ReleaseError);
  assert.throws(() => renderRelease(TEMPLATE, data({ date: "yesterday" })), ReleaseError);
});

const CL = "# Changelog\nintro\n\n## [Unreleased]\n### Added\n- one\n\n```\n## [fake]\n```\n- two\n\n## [0.1.0] - 2026-01-01\n### Added\n- old\n";
const BLOCK = "## [1.2.3] - 2026-10-02\nSee [RELEASE-1.2.3](docs/releases/RELEASE-1.2.3.md).\n\n### Added\n- thing";

test("[VCK-008-AC2] insertChangelog puts the block before the first older release and keeps Unreleased byte-identical", () => {
  const out = insertChangelog(CL, BLOCK);
  const cut = CL.indexOf("## [0.1.0]");
  assert.ok(cut > 0);
  assert.ok(out.startsWith(CL.slice(0, cut)));
  assert.equal(out, `${CL.slice(0, cut)}${BLOCK}\n\n${CL.slice(cut)}`);
});

test("[VCK-008-AC2] insertChangelog appends when no older release exists", () => {
  for (const cl of ["# C\n\n## [Unreleased]\n- x\n", "# C\n\n## [Unreleased]\n- x", "## [Unreleased]\n"]) {
    const out = insertChangelog(cl, BLOCK);
    assert.ok(out.startsWith(cl), cl);
    assert.equal(out.slice(cl.length).replace(/^\n+/, ""), `${BLOCK}\n`);
  }
});

test("[VCK-008-AC2] insertChangelog refuses unsafe input", () => {
  const bad = {
    "two Unreleased": `${CL}\n## [Unreleased]\n`,
    "no Unreleased": "# C\n## [0.1.0] - x\n",
    "link footer": `${CL}\n[Unreleased]: https://x/compare/v0.1.0...HEAD\n`,
    "version present": `${CL}\n## [1.2.3] - 2026-01-02\n`,
    empty: "  \n",
  };
  for (const [name, cl] of Object.entries(bad)) assert.throws(() => insertChangelog(cl, BLOCK), ReleaseError, name);
  assert.throws(() => insertChangelog(CL, "### Added\n- no heading"), ReleaseError);
  assert.throws(() => insertChangelog(CL, "## [1.2] - x\n"), ReleaseError);
});

test("[VCK-008-AC2] insertChangelog ignores fenced Unreleased and fenced link-refs", () => {
  const cl = "## [Unreleased]\n- x\n```\n## [Unreleased]\n[a]: b\n```\n";
  assert.ok(insertChangelog(cl, BLOCK).includes(BLOCK));
});

const README = "# Releases\nintro\n\n| Version | Date | Highlights | File |\n| --- | --- | --- | --- |\n| 0.1.0 | 2026-01-01 | first | RELEASE-0.1.0.md |\n| 0.2.0 | 2026-02-01 | second | RELEASE-0.2.0.md |\n\nafter\n";

test("[VCK-008-AC2] appendIndexRow adds the fixed row after the last table row", () => {
  const row = indexRow("1.2.3", "2026-10-02");
  assert.equal(row, "| 1.2.3 | 2026-10-02 | Draft: fill in highlights | RELEASE-1.2.3.md |");
  const out = appendIndexRow(README, row);
  assert.equal(out, README.replace("\n\nafter", `\n${row}\n\nafter`));
  const emptyTable = "| Version | Date | Highlights | File |\n| --- | --- | --- | --- |\n";
  assert.equal(appendIndexRow(emptyTable, row), `${emptyTable}${row}\n`);
  assert.equal(appendIndexRow(emptyTable.trimEnd(), row), `${emptyTable}${row}\n`);
});

test("[VCK-008-AC2] appendIndexRow refuses: no header table, version exists, non-fixed row text", () => {
  const row = indexRow("1.2.3", "2026-10-02");
  assert.throws(() => appendIndexRow("# Releases\n\n| Version | Date |\n| --- | --- |\n", row), ReleaseError);
  assert.throws(() => appendIndexRow("# Releases\nno table\n", row), ReleaseError);
  assert.throws(() => appendIndexRow("```\n| Version | Date | Highlights | File |\n| --- | --- | --- | --- |\n```\n", row), ReleaseError);
  assert.throws(() => appendIndexRow(appendIndexRow(README, row), row), ReleaseError);
  assert.throws(() => appendIndexRow(README, "| 1.2.3 | 2026-10-02 | injected highlights | RELEASE-1.2.3.md |"), ReleaseError);
  assert.throws(() => appendIndexRow(README, `${row}\n| 9.9.9 | x | y | z |`), ReleaseError);
});
