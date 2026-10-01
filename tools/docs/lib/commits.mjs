import { cap, oneLine } from "./render.mjs";

const SUBJECT = /^(feat|fix|refactor|docs|test|chore|perf|ci)(?:\(([^()\s]+)\))?(!)?: (.+)$/;
const TAIL = /^(.*?)(?:\s+\((VCK-\d{3})\))?(?:\s+\(#(\d+)\))?$/;
const BREAKING_FOOTER = /^BREAKING CHANGE:/m;
const BUG_ID = /\bBUG-\d{3}\b/g;
const CHANGED = new Set(["perf", "refactor"]);

/**
 * Parses one commit. Returns { type, scope, breaking, story, pr, bugIds, description } or { nonConforming: true, subject }.
 * Text is cleaned (BOM/CR/NUL/C0 stripped, one line, capped) but NOT escaped: render.sanitize escapes at output time.
 */
export function parseCommit(subject, body = "") {
  const clean = oneLine(String(subject));
  const m = clean.match(SUBJECT);
  if (!m) return { nonConforming: true, subject: cap(clean) };
  const [, type, scope, bang, rest] = m;
  const [, desc, story, pr] = rest.match(TAIL);
  if (desc === "") return { nonConforming: true, subject: cap(clean) };
  const text = String(body).replace(/\r/g, "");
  return {
    type,
    scope: scope ?? null,
    breaking: bang === "!" || BREAKING_FOOTER.test(text),
    story: story ?? null,
    pr: pr ?? null,
    bugIds: [...new Set([...(clean.match(BUG_ID) ?? []), ...(text.match(BUG_ID) ?? [])])],
    description: cap(desc),
  };
}

/** Buckets parsed commits: feat -> features, fix -> bugs, perf/refactor -> changed, rest counted in omittedCounts. */
export function groupCommits(commits) {
  const g = { features: [], bugs: [], changed: [], omittedCounts: {}, nonConforming: [], breaking: [] };
  for (const c of commits) {
    if (c.nonConforming) {
      g.nonConforming.push(c);
      continue;
    }
    if (c.breaking) g.breaking.push(c);
    if (c.type === "feat") g.features.push(c);
    else if (c.type === "fix") g.bugs.push(c);
    else if (CHANGED.has(c.type)) g.changed.push(c);
    else g.omittedCounts[c.type] = (g.omittedCounts[c.type] ?? 0) + 1;
  }
  return g;
}
