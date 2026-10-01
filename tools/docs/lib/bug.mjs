import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readText } from "./release-doc.mjs";
import { cleanLines, section, unfencedLines, unterminated } from "./sections.mjs";

// Only this exact name is skipped. Any file named bug-*.md (any case) must be exactly BUG-<nnn>-<slug>.md.
// ponytail: other extensions (BUG-002-x.md.bak) are ignored by design; add a check if stray copies become a problem.
const TEMPLATE = "BUG-000-template.md";
const GOOD_NAME = /^BUG-(\d{3})-.+\.md$/;
const LOOKS_LIKE_BUG = /^bug-.*\.md$/i;
const TITLE = /^# BUG-\d{3}(?:\s|$)/;
const SEVERITY = /^Severity: S[1-4](?: ·|$)/;
const STATUS = /(?:^| · )Status: (OPEN|INVESTIGATING|FIXED|VERIFIED|CLOSED)$/;
const PLACEHOLDER = /^(?:-->$|\d+\.|[-*])?\s*(?:Why\s*)?(?:\.{3})?$/;
const DONE = new Set(["FIXED", "VERIFIED", "CLOSED"]);
const count = (s, w) => s.split(w).length - 1;

/** The line right after the title must carry exactly one Severity and one Status; returns status or null. */
function checkHeader(lines, md, out) {
  if (!TITLE.test(lines[0] ?? "")) out.push("first line must be the '# BUG-<nnn> <title>' heading");
  const h = (lines[1] ?? "").trimEnd();
  if (count(h, "Severity:") !== 1 || !SEVERITY.test(h)) out.push("line 2 needs exactly one valid 'Severity: S1..S4' (header line)");
  const status = count(h, "Status:") === 1 ? h.match(STATUS)?.[1] : undefined;
  if (!status) out.push("line 2 needs exactly one valid 'Status: OPEN|INVESTIGATING|FIXED|VERIFIED|CLOSED' (header line)");
  if (unfencedLines(md).slice(2).some((l) => /^(Severity|Status):/i.test(l))) out.push("second Severity/Status header line found");
  return status ?? null;
}

function checkBody(md, num) {
  const out = [];
  const open = unterminated(md);
  if (open) out.push(`unterminated ${open}`);
  const status = checkHeader(cleanLines(md), md, out);
  if (!DONE.has(status)) return out;
  const cause = (section(md, "## Root cause (5 whys)") ?? []).filter((l) => !PLACEHOLDER.test(l.trim()));
  if (cause.length === 0) out.push(`${status} bug needs a filled '## Root cause (5 whys)' section`);
  const reg = (section(md, "## Regression test") ?? []).join("\n");
  if (!reg.includes(`[BUG-${num}]`)) out.push(`${status} bug needs '[BUG-${num}]' in '## Regression test'`);
  return out;
}

/** Validates docs/bugs/BUG-*.md; returns { violations: ["path: message"], count }. Fails closed on unreadable input. */
export function checkBugs(root) {
  const dir = "docs/bugs";
  let names;
  try {
    names = readdirSync(join(root, dir));
  } catch (e) {
    return { violations: [`${dir}: cannot read directory (${e.code ?? e.message})`], count: 0 };
  }
  const violations = [];
  let count = 0;
  const byNumber = new Map();
  for (const name of names.filter((n) => LOOKS_LIKE_BUG.test(n) && n !== TEMPLATE).sort()) {
    const path = `${dir}/${name}`;
    const m = name.match(GOOD_NAME);
    if (!m) {
      violations.push(`${path}: bad file name, expected BUG-<nnn>-<slug>.md (3 digits)`);
      continue;
    }
    count++;
    byNumber.set(m[1], [...(byNumber.get(m[1]) ?? []), name]);
    const r = readText(root, path);
    if (r.error) {
      violations.push(`${path}: ${r.error}`);
      continue;
    }
    for (const msg of checkBody(r.md, m[1])) violations.push(`${path}: ${msg}`);
  }
  for (const [num, files] of byNumber) if (files.length > 1) violations.push(`${dir}: duplicate BUG-${num} (${files.join(", ")})`);
  return { violations, count };
}
