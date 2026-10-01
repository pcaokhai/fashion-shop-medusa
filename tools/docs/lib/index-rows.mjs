import { readdirSync } from "node:fs";
import { join } from "node:path";
import { unfencedLines, unterminated } from "./sections.mjs";
import { GOOD_NAME, RELEASE_DIR, readText } from "./release-doc.mjs";

const BUG_NAME = /^BUG-(\d{3})-.+\.md$/;
const SEPARATOR = /^\|[\s:|-]*\|?$/;

/** "[text](target)" -> text; backticks and spaces dropped. */
const plain = (c) => c.replace(/^\[([^\]]*)\]\([^)]*\)$/, "$1").replace(/`/g, "").trim();
const target = (c) => (c.match(/^\[[^\]]*\]\(([^)]*)\)$/)?.[1] ?? c).replace(/`/g, "").trim();
const cells = (line) => line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/**
 * Parses the table rows of one README (outside fences/comments), skipping the header + separator.
 * Returns { rows: [{ cells }], violations }. Only ID-like cells are ever turned into file names by callers.
 */
function tableRows(root, rel, header) {
  const r = readText(root, rel);
  if (r.error) return { rows: [], violations: [`${rel}: ${r.error}`] };
  const open = unterminated(r.md);
  if (open) return { rows: [], violations: [`${rel}: unterminated ${open}`] };
  const rows = unfencedLines(r.md).map((l) => l.trim()).filter((l) => l.startsWith("|") && !SEPARATOR.test(l)).map(cells);
  return { rows: rows.filter((c) => c[0] !== header), violations: [] };
}

function list(root, dir) {
  try {
    return { names: readdirSync(join(root, dir)) };
  } catch (e) {
    return { error: `${dir}: cannot read directory (${e.code ?? e.message})` };
  }
}

/** Shared two-way comparison: ids from files vs ids from rows. `parse(cells)` -> { id } | { bad } | null (skip). */
function compare(rel, rows, fileIds, parse, label, out) {
  const seen = new Set();
  for (const c of rows) {
    const p = parse(c);
    if (!p) continue;
    if (p.bad) out.push(`${rel}: malformed index row '${c.join(" | ")}' (${p.bad})`);
    else if (seen.has(p.id)) out.push(`${rel}: duplicate index row for ${label(p.id)}`);
    else {
      seen.add(p.id);
      if (!fileIds.has(p.id)) out.push(`${rel}: index row for ${label(p.id)} but no file exists`);
    }
  }
  for (const id of fileIds) if (!seen.has(id)) out.push(`${rel}: ${label(id)} has no index row`);
}

/** BUG-nnn files <-> docs/bugs/README.md rows; RELEASE-x.y.z files <-> docs/releases/README.md rows. */
export function checkIndexes(root) {
  const violations = [];
  let count = 0;
  const bugsDir = list(root, "docs/bugs");
  const relDir = list(root, RELEASE_DIR);
  if (bugsDir.error) violations.push(bugsDir.error);
  if (relDir.error) violations.push(relDir.error);

  const bugRel = "docs/bugs/README.md";
  const b = tableRows(root, bugRel, "ID");
  violations.push(...b.violations);
  if (!bugsDir.error && b.violations.length === 0) {
    const ids = new Set(bugsDir.names.map((n) => n.match(BUG_NAME)?.[1]).filter((id) => id && id !== "000"));
    count += ids.size;
    compare(bugRel, b.rows, ids, (c) => {
      const m = plain(c[0]).match(/^BUG-(\d{3})$/);
      return m ? (m[1] === "000" ? null : { id: m[1] }) : { bad: "first cell must be BUG-<nnn>" };
    }, (id) => `BUG-${id}`, violations);
  }

  const relRel = "docs/releases/README.md";
  const r = tableRows(root, relRel, "Version");
  violations.push(...r.violations);
  if (!relDir.error && r.violations.length === 0) {
    const ids = new Set(relDir.names.map((n) => n.match(GOOD_NAME)?.[1]).filter(Boolean));
    count += ids.size;
    compare(relRel, r.rows, ids, (c) => {
      const v = plain(c[0]);
      if (/template/i.test(v)) return null;
      const m = v.match(/^v?(\d+\.\d+\.\d+)$/);
      if (!m) return { bad: "first cell must be <x.y.z>" };
      if (target(c[3] ?? "") !== `RELEASE-${m[1]}.md`) return { bad: `File cell must be RELEASE-${m[1]}.md` };
      return { id: m[1] };
    }, (id) => `RELEASE-${id}`, violations);
  }
  return { violations, count };
}
