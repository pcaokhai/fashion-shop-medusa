/* global process */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseChangeset, readChangesets } from "../lib/changeset.mjs";
import { ReleaseError } from "../lib/errors.mjs";

const fm = (lines, body = "Summary text.") => `---\n${lines.join("\n")}\n---\n\n${body}\n`;
const tmp = (t) => {
  const d = mkdtempSync(join(tmpdir(), "docs-changeset-"));
  t.after(() => rmSync(d, { recursive: true, force: true }));
  return d;
};

test("[VCK-008-AC2] valid changeset and several packages", () => {
  const one = parseChangeset(fm(['"@vck/a": minor']));
  assert.deepEqual(one, { packages: [{ name: "@vck/a", bump: "minor" }], summary: "Summary text." });
  const many = parseChangeset(`\uFEFF${fm(['"@vck/a": patch', '"b-pkg": major']).replace(/\n/g, "\r\n")}`);
  assert.deepEqual(many.packages, [{ name: "@vck/a", bump: "patch" }, { name: "b-pkg", bump: "major" }]);
  assert.equal(many.summary, "Summary text.");
});

test("[VCK-008-AC2] malformed changesets throw ReleaseError", () => {
  const bad = {
    "no front-matter": "Just text\n",
    "unterminated front-matter": '---\n"a": patch\n\nbody\n',
    "empty front-matter": fm([]),
    "bad bump": fm(['"a": huge']),
    "unquoted junk line": fm(["a patch"]),
    "empty body": fm(['"a": patch'], "   "),
  };
  for (const [name, text] of Object.entries(bad)) assert.throws(() => parseChangeset(text), ReleaseError, name);
});

test("[VCK-008-AC2] readChangesets: README ignored, sorted, absent dir is zero", (t) => {
  const d = tmp(t);
  assert.deepEqual(readChangesets(join(d, "none")), []);
  const dir = join(d, ".changeset");
  mkdirSync(dir);
  writeFileSync(join(dir, "README.md"), "not a changeset");
  writeFileSync(join(dir, "config.json"), "{}");
  writeFileSync(join(dir, "b.md"), fm(['"p": patch'], "B"));
  writeFileSync(join(dir, "a.md"), fm(['"p": minor'], "A"));
  const got = readChangesets(dir);
  assert.deepEqual(got.map((c) => [c.file, c.summary]), [["a.md", "A"], ["b.md", "B"]]);
});

test("[VCK-008-AC2] readChangesets fails closed: bad file, directory named x.md, not a directory", (t) => {
  const d = tmp(t);
  const dir = join(d, ".changeset");
  mkdirSync(dir);
  writeFileSync(join(dir, "bad.md"), "no front matter");
  assert.throws(() => readChangesets(dir), ReleaseError);
  rmSync(join(dir, "bad.md"));
  mkdirSync(join(dir, "x.md"));
  assert.throws(() => readChangesets(dir), /x\.md/);
  const file = join(d, "afile");
  writeFileSync(file, "x");
  assert.throws(() => readChangesets(file), ReleaseError);
});

test("[VCK-008-AC2] readChangesets fails closed on an unreadable directory", (t) => {
  if (process.getuid?.() === 0) return t.skip("root can read anything");
  const d = tmp(t);
  const dir = join(d, ".changeset");
  mkdirSync(dir);
  chmodSync(dir, 0o000);
  try {
    assert.throws(() => readChangesets(dir), ReleaseError);
  } finally {
    chmodSync(dir, 0o755);
  }
});
