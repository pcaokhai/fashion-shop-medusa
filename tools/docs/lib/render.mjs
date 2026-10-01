import { ReleaseError } from "./errors.mjs";
import { requiredSections } from "./release-doc.mjs";
import { rows, unterminated } from "./sections.mjs";

const MAX = 200;
const SEMVER = "(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERSION = new RegExp(`^${SEMVER}$`);
const INDEX_HEADER = "| Version | Date | Highlights | File |";
const INDEX_ROW = new RegExp(`^\\| (${SEMVER}) \\| \\d{4}-\\d{2}-\\d{2} \\| Draft: fill in highlights \\| RELEASE-\\1\\.md \\|$`);
const DASH = "—";

/** BOM/NUL/C0 stripped, all whitespace (incl. CR/LF/tab) collapsed to single spaces. No escaping, no cap. */
// eslint-disable-next-line no-control-regex
export const oneLine = (text) => String(text).replace(/[\u0000-\u0008\u000E-\u001F\u007F\uFEFF]/g, "").replace(/[\s\u0085]+/g, " ").trim();

/** At most 200 code points, then `…`. */
export const cap = (text) => {
  const cps = Array.from(text);
  return cps.length > MAX ? `${cps.slice(0, MAX).join("")}…` : text;
};

/** One safe line for a markdown table cell / list item: cleaned, capped, then `<`, `>`, backtick and `|` neutralised. */
export const sanitize = (text) =>
  cap(oneLine(text)).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/`/g, "'").replace(/\|/g, "\\|");

/** The only index row text that is ever written: no commit-derived text. */
export const indexRow = (version, date) => `| ${version} | ${date} | Draft: fill in highlights | RELEASE-${version}.md |`;

const need = (re, v, what) => {
  if (typeof v !== "string" || !re.test(v)) throw new ReleaseError(`invalid ${what}: ${JSON.stringify(v)}`);
  return v;
};
const suffix = (c) => (c.pr == null ? "" : ` (#${need(/^\d+$/, c.pr, "PR number")})`);

/** [start, end) of a section body (lines after its heading, up to the next unfenced `## `). */
function span(lines, head) {
  const r = rows(lines.join("\n"));
  const at = r.findIndex((x) => !x.fenced && x.line.trimEnd() === head);
  if (at < 0) throw new ReleaseError(`template has no '${head}' section`);
  const next = r.findIndex((x, i) => i > at && !x.fenced && x.line.startsWith("## "));
  return [at + 1, next < 0 ? lines.length : next];
}

/** Table rows appended after the template's own table lines; no rows replaces the table with `None.`. */
function fillTable(lines, head, tableRows) {
  const [s, e] = span(lines, head);
  const t = lines.map((l, i) => (i >= s && i < e && l.startsWith("|") ? i : -1)).filter((i) => i >= 0);
  if (t.length < 2) throw new ReleaseError(`'${head}' has no table to fill`);
  const out = [...lines];
  if (tableRows.length === 0) out.splice(t[0], t.length, "None.");
  else out.splice(t[t.length - 1] + 1, 0, ...tableRows);
  return out;
}

function addBreaking(lines, items) {
  if (items.length === 0) return lines;
  const [s, e] = span(lines, "## Summary");
  const p = lines.findIndex((l, i) => i >= s && i < e && l.trim() !== "");
  if (p < 0) throw new ReleaseError("'## Summary' has no prompt line");
  const out = [...lines];
  out.splice(p + 1, 0, ...items.map((c) => `- BREAKING: ${sanitize(c.description)}`));
  return out;
}

const featureRow = (c) => `| ${c.story == null ? DASH : need(/^VCK-\d{3}$/, c.story, "story id")} | ${sanitize(c.description)}${suffix(c)} | ${DASH} |`;
const bugRows = (c) =>
  (c.bugIds.length > 0 ? c.bugIds : [DASH]).map((id) => `| ${id === DASH ? id : need(/^BUG-\d{3}$/, id, "bug id")} | ${DASH} | ${sanitize(c.description)}${suffix(c)} |`);

/**
 * Fills the template (kept verbatim otherwise, R-008-13). data: { version, date, features, bugs, breaking, nonConforming }.
 * Throws unless the result still has exactly the template's `## ` sections and no open fence/comment.
 */
export function renderRelease(template, data) {
  need(VERSION, data.version, "version");
  need(DATE, data.date, "date");
  let heads;
  try {
    heads = requiredSections(template);
  } catch (e) {
    throw new ReleaseError(`template: ${e.message}`);
  }
  let lines = template.replace(/^\uFEFF/, "").split(/\r?\n/);
  const firstH = lines.findIndex((l) => l.startsWith("## "));
  lines = lines.map((l, i) => (i < firstH ? l.replaceAll("<x.y.z>", data.version).replaceAll("<yyyy-mm-dd>", data.date) : l));
  lines = fillTable(lines, "## Features", data.features.map(featureRow));
  lines = fillTable(lines, "## Bugs fixed", data.bugs.flatMap(bugRows));
  lines = addBreaking(lines, data.breaking);
  if (data.nonConforming.length > 0) {
    lines.splice(1, 0, `<!-- Non-conforming commits (${data.nonConforming.length}): ${data.nonConforming.map((c) => sanitize(c.subject)).join(" ; ")} -->`);
  }
  const out = lines.join("\n");
  const open = unterminated(out);
  if (open) throw new ReleaseError(`rendered release has an unterminated ${open}`);
  if (JSON.stringify(requiredSections(out)) !== JSON.stringify(heads)) throw new ReleaseError("rendered release changed the template sections");
  return out;
}

const offsets = (lines) => lines.reduce((a, l) => [...a, a[a.length - 1] + l.length + 1], [0]);

/** Inserts `block` (`## [x.y.z] - date` ...) after the Unreleased block, before the first older release or at EOF. */
export function insertChangelog(changelog, block) {
  const version = String(block).match(new RegExp(`^## \\[(${SEMVER})\\] - \\d{4}-\\d{2}-\\d{2}(?:\\n|$)`))?.[1];
  if (!version) throw new ReleaseError("changelog block must start with '## [x.y.z] - yyyy-mm-dd'");
  if (changelog.trim() === "") throw new ReleaseError("CHANGELOG is empty");
  if (changelog.includes("\r")) throw new ReleaseError("CHANGELOG with CR line endings is not supported");
  const lines = changelog.split("\n");
  const r = rows(changelog);
  const live = (re) => r.map((x, i) => (!x.fenced && re.test(x.line) ? i : -1)).filter((i) => i >= 0);
  if (live(/^\[[^\]]+\]: /).length > 0) throw new ReleaseError("CHANGELOG link-reference lines are not supported");
  const unreleased = live(/^## \[Unreleased\]\s*$/);
  if (unreleased.length !== 1) throw new ReleaseError(`CHANGELOG needs exactly one '## [Unreleased]', found ${unreleased.length}`);
  if (live(new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\]`)).length > 0) throw new ReleaseError(`CHANGELOG already has ${version}`);
  const end = live(/^## \[/).find((i) => i > unreleased[0]);
  const pos = end === undefined ? changelog.length : offsets(lines)[end];
  const head = changelog.slice(0, pos);
  const sep = head.endsWith("\n\n") ? "" : head.endsWith("\n") ? "\n" : "\n\n";
  const tail = changelog.slice(pos);
  return `${head}${sep}${block.trimEnd()}\n${tail === "" ? "" : `\n${tail}`}`;
}

/** Appends the fixed draft row after the last row of the `| Version | Date | Highlights | File |` table. */
export function appendIndexRow(readme, row) {
  const m = String(row).match(INDEX_ROW);
  if (!m) throw new ReleaseError("index row must be the fixed draft row");
  const lines = readme.split("\n");
  const r = rows(readme);
  const rowAt = (i) => !r[i].fenced && r[i].line.trim().startsWith("|");
  const headers = r.map((x, i) => (!x.fenced && x.line.trim() === INDEX_HEADER ? i : -1)).filter((i) => i >= 0);
  if (headers.length !== 1) throw new ReleaseError(`README needs exactly one '${INDEX_HEADER}' table, found ${headers.length}`);
  const h = headers[0];
  if (!(h + 1 < r.length && rowAt(h + 1) && /^\|[\s:|-]*\|?$/.test(r[h + 1].line.trim()))) throw new ReleaseError("README index table has no separator row");
  let last = h + 1;
  while (last + 1 < r.length && rowAt(last + 1)) last++;
  for (let i = h + 2; i <= last; i++) {
    if (r[i].line.split("|")[1]?.trim().replace(/^v/, "") === m[1]) throw new ReleaseError(`README already has a row for ${m[1]}`);
  }
  const crlf = lines[last].endsWith("\r");
  const nl = crlf ? "\r\n" : "\n";
  const pos = offsets(lines)[last] + lines[last].length - (crlf ? 1 : 0);
  const atEof = pos + (crlf ? 1 : 0) === readme.length;
  return `${readme.slice(0, pos)}${nl}${row}${atEof ? nl : ""}${readme.slice(pos)}`;
}
