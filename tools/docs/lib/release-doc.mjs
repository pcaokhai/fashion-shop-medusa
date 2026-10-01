import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sections, trimBlank, unfencedLines, unterminated } from "./sections.mjs";

export const TEMPLATE = "RELEASE-template.md";
export const RELEASE_DIR = "docs/releases";
export const GOOD_NAME = /^RELEASE-(\d+\.\d+\.\d+)\.md$/;
const LOOKS_LIKE_RELEASE = /^release-/i;
export const REQUIRED_FILES = [
  "docs/bugs/README.md",
  "docs/releases/README.md",
  "docs/progress/PROGRESS.md",
  "CHANGELOG.md",
  "docs/bugs/BUG-000-template.md",
  "docs/releases/RELEASE-template.md",
];

/** { md } or { error: "cannot read file (CODE)" | "empty" }; BOM stripped. Never follows paths outside root (callers pass fixed names). */
export function readText(root, rel) {
  try {
    const md = readFileSync(join(root, rel), "utf8").replace(/^\uFEFF/, "");
    return md.trim() === "" ? { error: "empty file" } : { md };
  } catch (e) {
    return { error: `cannot read file (${e.code ?? e.message})` };
  }
}

/** Required H2 headings, derived from the template text (unique, at least one). */
export function requiredSections(templateMd) {
  const heads = unfencedLines(templateMd).filter((l) => l.startsWith("## ")).map((l) => l.trimEnd());
  if (heads.length === 0) throw new Error("no '## ' sections");
  if (new Set(heads).size !== heads.length) throw new Error("duplicate '## ' sections");
  return heads;
}

/** Non-blank, comment-stripped body lines of a block, trailing spaces ignored. */
const norm = (lines) => trimBlank(lines.map((l) => l.trimEnd())).join("\n");

function checkRelease(md, heads, template) {
  const out = [];
  const open = unterminated(md);
  if (open) return [`unterminated ${open}`];
  for (const h of heads) {
    const found = sections(md, h);
    if (found.length !== 1) {
      out.push(found.length === 0 ? `missing section '${h}'` : `section '${h}' found ${found.length} times, expected once`);
      continue;
    }
    const b = norm(found[0]);
    if (b === "") out.push(`section '${h}' is empty (write 'None.' if nothing applies)`);
    else if (b === norm(template.get(h))) out.push(`section '${h}' is still the template placeholder (write 'None.' if nothing applies)`);
  }
  return out;
}

/** Validates docs/releases/RELEASE-x.y.z.md; returns { violations, count }. Fails closed. */
export function checkReleases(root) {
  let names;
  try {
    names = readdirSync(join(root, RELEASE_DIR));
  } catch (e) {
    return { violations: [`${RELEASE_DIR}: cannot read directory (${e.code ?? e.message})`], count: 0 };
  }
  const violations = [];
  const t = readText(root, `${RELEASE_DIR}/${TEMPLATE}`);
  let heads = [];
  let tplSections = new Map();
  if (t.error) violations.push(`${RELEASE_DIR}/${TEMPLATE}: cannot derive sections (${t.error})`);
  else {
    try {
      heads = requiredSections(t.md);
      tplSections = new Map(heads.map((h) => [h, sections(t.md, h)[0]]));
    } catch (e) {
      violations.push(`${RELEASE_DIR}/${TEMPLATE}: cannot derive sections (${e.message})`);
    }
  }
  let count = 0;
  for (const name of names.filter((n) => LOOKS_LIKE_RELEASE.test(n) && n !== TEMPLATE).sort()) {
    const path = `${RELEASE_DIR}/${name}`;
    if (!GOOD_NAME.test(name)) {
      violations.push(`${path}: bad file name, expected RELEASE-<MAJOR>.<MINOR>.<PATCH>.md (digits only)`);
      continue;
    }
    count++;
    const r = readText(root, path);
    if (r.error) violations.push(`${path}: ${r.error}`);
    else if (heads.length > 0) for (const m of checkRelease(r.md, heads, tplSections)) violations.push(`${path}: ${m}`);
  }
  return { violations, count };
}

/** Every required file exists, is a readable file and is non-empty. */
export function checkRequiredFiles(root) {
  const violations = [];
  for (const f of REQUIRED_FILES) {
    const r = readText(root, f);
    if (r.error) violations.push(`${f}: ${r.error}`);
  }
  return { violations, count: REQUIRED_FILES.length };
}
