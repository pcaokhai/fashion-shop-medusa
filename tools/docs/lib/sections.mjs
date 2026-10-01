const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;

/** Strip `<!-- -->` from one line; returns [text, stillInComment]. Unterminated comments swallow the rest (fails closed). */
function stripLine(line, inComment) {
  let text = "";
  let rest = line;
  let c = inComment;
  for (;;) {
    if (c) {
      const end = rest.indexOf("-->");
      if (end < 0) return [text, true];
      rest = rest.slice(end + 3);
      c = false;
    } else {
      const start = rest.indexOf("<!--");
      if (start < 0) return [text + rest, false];
      text += rest.slice(0, start);
      rest = rest.slice(start + 4);
      c = true;
    }
  }
}

/**
 * One pass over the document: comments are removed only outside fences (fence text is literal), fences are not
 * recognised inside comments. Comment-only lines become "" so line counts are preserved.
 * Returns { rows: [{ line, fenced }], open: unclosed fence | null, comment: bool }.
 */
function scan(md) {
  const out = [];
  let open = null;
  let comment = false;
  for (const raw of md.split(/\r?\n/)) {
    if (open) {
      const c = raw.match(FENCE_CLOSE);
      out.push({ line: raw, fenced: true });
      if (c && c[1][0] === open[0] && c[1].length >= open.length) open = null;
      continue;
    }
    const [line, still] = stripLine(raw, comment);
    comment = still;
    const o = line.match(FENCE_OPEN);
    if (o && !(o[1][0] === "`" && o[2].includes("`"))) {
      open = o[1];
      out.push({ line, fenced: true });
    } else out.push({ line, fenced: false });
  }
  return { rows: out, open, comment };
}

/** "code fence" | "HTML comment" when one is never closed (runs to EOF), else null: callers must treat it as a violation. */
export const unterminated = (md) => {
  const s = scan(md);
  return s.open ? "code fence" : s.comment ? "HTML comment" : null;
};

/** Document lines after comment stripping (fenced lines included). */
export const cleanLines = (md) => scan(md).rows.map((r) => r.line);

/** Lines of every block whose heading line equals `heading` (exact, trailing space ignored), up to the next `## ` line. Fence-aware. */
export function sections(md, heading) {
  const out = [];
  let cur = null;
  for (const { line, fenced } of scan(md).rows) {
    if (!fenced && line.startsWith("## ")) {
      cur = line.trimEnd() === heading ? [] : null;
      if (cur) out.push(cur);
    } else if (cur) cur.push(line);
  }
  return out;
}

/** First block for `heading`, or null when absent. */
export const section = (md, heading) => sections(md, heading)[0] ?? null;

/** Lines outside fences (for scanning header-like lines). */
export const unfencedLines = (md) => scan(md).rows.filter((r) => !r.fenced).map((r) => r.line);

/** Drop leading and trailing blank lines; interior blanks stay. */
export function trimBlank(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && lines[a].trim() === "") a++;
  while (b > a && lines[b - 1].trim() === "") b--;
  return lines.slice(a, b);
}

/** One entry per source line (same count as `md.split("\n")`): { line (comments stripped), fenced }. */
export const rows = (md) => scan(md).rows;
