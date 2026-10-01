/* global console, URL */
// Library: main (the CLI is release-cli.mjs; env: VCK_ROOT, VCK_DATE). Drafts RELEASE-x.y.z.md, a CHANGELOG block and an index row.
// Order is fixed (R-008-6/16/18): validate args -> assert releasable -> read ALL inputs -> compute in memory -> refuse -> write atomically.
// Never commits, tags, pushes or runs docs-check. Any problem prints `release: <reason>` and returns 1 with every file untouched.
import { chmodSync, lstatSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readChangesets } from "./lib/changeset.mjs";
import { groupCommits, parseCommit } from "./lib/commits.mjs";
import { ReleaseError } from "./lib/errors.mjs";
import { assertReleasable, gitRun, lastTag, readCommits } from "./lib/git.mjs";
import { appendIndexRow, indexRow, insertChangelog, renderRelease, sanitize } from "./lib/render.mjs";
import { RELEASE_DIR, TEMPLATE, readText, requiredSections } from "./lib/release-doc.mjs";
import { sections, trimBlank } from "./lib/sections.mjs";

const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const TMP_SUFFIX = ".vck-tmp";
const FILE_MODE = 0o644;
const REAL_OPS = { writeFileSync, chmodSync, renameSync, rmSync };

/** yyyy-mm-dd that is a real calendar date. */
function parseDate(d) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00Z`) : new Date(NaN); // month 13 etc. is an Invalid Date
  const ok = !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
  if (!ok) throw new ReleaseError(`invalid VCK_DATE ${JSON.stringify(d)} (expected a real date, yyyy-mm-dd)`);
  return d;
}

function readRaw(root, rel) {
  let md;
  try {
    if (lstatSync(join(root, rel)).isSymbolicLink()) throw new ReleaseError(`${rel}: is a symlink; refusing to replace it (use a regular file)`);
    md = readFileSync(join(root, rel), "utf8");
  } catch (e) {
    if (e instanceof ReleaseError) throw e;
    throw new ReleaseError(`${rel}: cannot read file (${e.code ?? e.message})`);
  }
  if (md.trim() === "") throw new ReleaseError(`${rel}: empty file`);
  return md;
}

const exists = (p) => {
  try {
    lstatSync(p);
    return true;
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw new ReleaseError(`${p}: cannot inspect (${e.code ?? e.message})`);
  }
};

const entry = (c) => `- ${c.breaking ? "BREAKING: " : ""}${sanitize(c.description)}${c.story ? ` (${c.story})` : ""}${c.pr ? ` (#${c.pr})` : ""}`;
const csEntry = (c) => `- ${c.packages.some((p) => p.bump === "major") ? "BREAKING: " : ""}${sanitize(c.summary)} (${c.packages.map((p) => p.name).join(", ")})`;

/** `## [x.y.z] - date` block; a `###` heading only when it has entries. */
function changelogBlock(version, date, g, changesets) {
  const groups = [["Added", g.features.map(entry)], ["Fixed", g.bugs.map(entry)], ["Changed", [...g.changed.map(entry), ...changesets.map(csEntry)]]];
  const parts = [`## [${version}] - ${date}`, `See [RELEASE-${version}](${RELEASE_DIR}/RELEASE-${version}.md).`];
  for (const [title, items] of groups) if (items.length > 0) parts.push("", `### ${title}`, ...items);
  return `${parts.join("\n")}\n`;
}

const norm = (lines) => trimBlank(lines.map((l) => l.trimEnd())).join("\n");
const isTable = (l) => l.trim().startsWith("|");

/** Template sections the draft still carries unedited: identical body, or the prompt (non-table) lines all still present. */
function untouchedSections(template, draft) {
  return requiredSections(template).filter((h) => {
    const t = sections(template, h)[0];
    const d = sections(draft, h)[0] ?? [];
    if (norm(t) === norm(d)) return true;
    const prompt = t.filter((l) => l.trim() !== "" && !isTable(l));
    return prompt.length > 0 && prompt.every((l) => d.some((x) => x.trimEnd() === l.trimEnd()));
  }).map((h) => h.replace(/^## /, ""));
}

/** > 0 when a is the higher x.y.z (an optional leading v is ignored). */
const cmp = (a, b) => {
  const [x, y] = [a, b].map((v) => v.replace(/^v/, "").split(".").map(Number));
  const i = x.findIndex((n, k) => n !== y[k]);
  return i < 0 ? 0 : x[i] - y[i];
};

/** Fail closed: a drafted-but-untagged previous release would make this one re-list the whole history. */
function assertOrdered(root, version, tag, changelog) {
  if (tag && cmp(version, tag) <= 0) throw new ReleaseError(`VERSION ${version} must be greater than the last tag ${tag}`);
  for (const [, v] of changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)) {
    if (v !== version && gitRun(root, ["rev-parse", "-q", "--verify", `refs/tags/v${v}`]).status !== 0) throw new ReleaseError(`CHANGELOG has ## [${v}] but tag v${v} does not exist (previous release drafted but untagged): tag v${v} first`);
  }
}

/** Reads everything and computes the three new files in memory. Throws ReleaseError; touches nothing. */
export function buildRelease(root, version, date) {
  assertReleasable(root, version);
  const tplPath = `${RELEASE_DIR}/${TEMPLATE}`;
  const tpl = readText(root, tplPath);
  if (tpl.error) throw new ReleaseError(`${tplPath}: ${tpl.error}`);
  const readmeRel = `${RELEASE_DIR}/README.md`;
  const readme = readRaw(root, readmeRel);
  const changelog = readRaw(root, "CHANGELOG.md");
  const changesets = readChangesets(join(root, ".changeset"));
  const tag = lastTag(root);
  assertOrdered(root, version, tag, changelog);
  const { commits: raw, merges } = readCommits(root, tag);
  const parsed = raw.map((c) => parseCommit(c.subject, c.body));
  if (raw.length === 0 && changesets.length === 0) throw new ReleaseError(`nothing to release: no commits ${tag ? `since ${tag}` : "in history"} and no changesets`);
  const g = groupCommits(parsed);
  const majors = changesets.filter((c) => c.packages.some((p) => p.bump === "major")).map((c) => ({ description: c.summary }));
  const releaseRel = `${RELEASE_DIR}/RELEASE-${version}.md`;
  if (exists(join(root, releaseRel))) throw new ReleaseError(`${releaseRel} already exists (delete it by hand to redo)`);
  const draft = renderRelease(tpl.md, { version, date, features: g.features, bugs: g.bugs, breaking: [...g.breaking, ...majors], nonConforming: g.nonConforming });
  const files = [
    { rel: releaseRel, content: draft, original: null },
    { rel: readmeRel, content: appendIndexRow(readme, indexRow(version, date)), original: readme },
    { rel: "CHANGELOG.md", content: insertChangelog(changelog, changelogBlock(version, date, g, changesets)), original: changelog },
  ];
  return { files, tag, merges, parsed, g, untouched: untouchedSections(tpl.md, draft) };
}

/** R-008-18: temp files first, then renames; any failure restores the originals and removes every temp file we made. */
export function writeAll(root, files, ops = REAL_OPS) {
  const items = files.map((f) => ({ ...f, path: join(root, f.rel), tmp: join(root, f.rel) + TMP_SUFFIX }));
  const made = [];
  /** Removes our temp files; returns the ones that could not be removed. */
  const dropTemps = () => made.filter((p) => {
    try {
      ops.rmSync(p, { force: true });
      return false;
    } catch {
      return true;
    }
  });
  const leftovers = (left) => (left.length > 0 ? `; leftover temp files, delete them by hand (and run git checkout on the release files if in doubt): ${left.join(", ")}` : "");
  let current = "";
  try {
    for (const it of items) {
      current = it.tmp;
      const mode = it.original === null ? FILE_MODE : statSync(it.path).mode & 0o777;
      try {
        ops.writeFileSync(it.tmp, it.content, { flag: "wx", mode });
      } catch (e) {
        if (e.code !== "EEXIST") made.push(it.tmp); // an EEXIST file is not ours: never delete it
        throw e;
      }
      made.push(it.tmp);
      ops.chmodSync(it.tmp, mode); // the creation mode is filtered by umask; restore the exact one
    }
  } catch (e) {
    const left = dropTemps();
    const stale = e.code === "EEXIST" ? " (stale file from an earlier run? it was left untouched; delete it and retry)" : "";
    throw new ReleaseError(`cannot write temporary file ${current} (${e.code ?? e.message})${stale}; no release file was changed${leftovers(left)}`);
  }
  const done = [];
  try {
    for (const it of items) {
      current = it.path;
      ops.renameSync(it.tmp, it.path);
      done.push(it);
    }
  } catch (e) {
    const failed = [];
    for (const it of done) {
      try {
        if (it.original === null) ops.rmSync(it.path, { force: true });
        else ops.writeFileSync(it.path, it.original);
      } catch {
        failed.push(it.rel);
      }
    }
    const left = dropTemps();
    const tail = failed.length > 0 ? `; RESTORE FAILED for ${failed.join(", ")}: run git checkout on them and delete the new release file` : "; originals restored";
    throw new ReleaseError(`cannot replace ${current} (${e.code ?? e.message})${tail}${leftovers(left)}`);
  }
}

const countsLine = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, n]) => `${k} ${n}`).join(", ");

function report(io, plan, version) {
  const { g, tag, merges, parsed, files, untouched } = plan;
  const total = parsed.length;
  io.log(tag ? `range ${tag}..HEAD (${total} commits)` : `no v* tag: first release, range = entire history (${total} commits)`);
  const types = {};
  for (const c of parsed) if (!c.nonConforming) types[c.type] = (types[c.type] ?? 0) + 1;
  io.log(`commits by type: ${countsLine(types) || "none"}`);
  if (Object.keys(g.omittedCounts).length > 0) io.log(`omitted: ${countsLine(g.omittedCounts)}`);
  io.log(`skipped merge commits: ${merges}`);
  if (g.nonConforming.length > 0) {
    io.log(`non-conforming subjects (${g.nonConforming.length}):`);
    for (const c of g.nonConforming) io.log(`  - ${sanitize(c.subject)}`);
  }
  for (const f of files) io.log(`wrote ${f.rel}`);
  io.log(`release ${version} drafted: nothing committed or tagged`);
  io.log("Reminders: the CHANGELOG `## [Unreleased]` content is NOT moved (curate it by hand); .changeset/ files are NOT deleted (remove them after the release).");
  io.log(`DRAFT: \`make docs-check\` fails until ${untouched.join(", ")} are edited (write \`None.\` if nothing applies)`);
}

/** Returns the exit code; io = { log, error }; ops = fs seam for tests. Never calls process.exit. */
export function main(env, argv, io = console, ops = REAL_OPS) {
  try {
    if (env.VCK_ROOT === "") throw new ReleaseError("VCK_ROOT is set but empty");
    if (argv.length !== 1) throw new ReleaseError("usage: release VERSION (make release VERSION=x.y.z)");
    const version = argv[0];
    if (!VERSION.test(version)) throw new ReleaseError(`invalid VERSION ${JSON.stringify(version)} (expected x.y.z, digits only, no leading zeros)`);
    const date = parseDate(env.VCK_DATE ?? new Date().toISOString().slice(0, 10));
    const root = resolve(env.VCK_ROOT ?? fileURLToPath(new URL("../../", import.meta.url)));
    const plan = buildRelease(root, version, date);
    writeAll(root, plan.files, ops);
    report(io, plan, version);
    return 0;
  } catch (e) {
    io.error(`release: ${e instanceof ReleaseError ? e.message : `unexpected error (${e?.message ?? e})`}`);
    return 1;
  }
}
