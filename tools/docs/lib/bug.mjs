import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { section, trimBlank } from "./sections.mjs";

const TEMPLATE = "BUG-000-template.md";
const GOOD_NAME = /^BUG-(\d{3})-.+\.md$/;
const SEVERITY = /^Severity: S[1-4]\s*(?:·|$)/m;
const STATUS = /^(?:Severity:[^\n]*·\s*)?Status: (OPEN|INVESTIGATING|FIXED|VERIFIED|CLOSED)\s*(?:·|$)/m;
const PLACEHOLDER = /^(?:\d+\.\s*)?(?:Why\s*)?\.{3}$/;
const DONE = new Set(["FIXED", "VERIFIED", "CLOSED"]);

function checkBody(md, num) {
  const out = [];
  if (!SEVERITY.test(md)) out.push("missing or invalid 'Severity: S1..S4' header");
  const status = md.match(STATUS)?.[1];
  if (!status) {
    out.push("missing or invalid 'Status: OPEN|INVESTIGATING|FIXED|VERIFIED|CLOSED' header");
    return out;
  }
  if (!DONE.has(status)) return out;
  const cause = trimBlank(section(md, "## Root cause (5 whys)") ?? []).filter((l) => !PLACEHOLDER.test(l.trim()));
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
  for (const name of names.filter((n) => /^BUG-.*\.md$/.test(n) && n !== TEMPLATE).sort()) {
    const path = `${dir}/${name}`;
    const m = name.match(GOOD_NAME);
    if (!m) {
      violations.push(`${path}: bad file name, expected BUG-<nnn>-<slug>.md (3 digits)`);
      continue;
    }
    count++;
    let md;
    try {
      md = readFileSync(join(root, path), "utf8");
    } catch (e) {
      violations.push(`${path}: cannot read file (${e.code ?? e.message})`);
      continue;
    }
    for (const msg of checkBody(md, m[1])) violations.push(`${path}: ${msg}`);
  }
  return { violations, count };
}
