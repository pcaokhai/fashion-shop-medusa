const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;

/** Yields { line, fenced } per line; fence delimiter lines are fenced too. `open` is the still-open fence at EOF. */
function scan(md) {
  const out = [];
  let open = null;
  for (const line of md.split(/\r?\n/)) {
    if (open) {
      const c = line.match(FENCE_CLOSE);
      out.push({ line, fenced: true });
      if (c && c[1][0] === open[0] && c[1].length >= open.length) open = null;
    } else {
      const o = line.match(FENCE_OPEN);
      if (o && !(o[1][0] === "`" && o[2].includes("`"))) {
        open = o[1];
        out.push({ line, fenced: true });
      } else out.push({ line, fenced: false });
    }
  }
  return { rows: out, open };
}

/** True when a ``` / ~~~ fence is never closed (runs to EOF): callers must treat it as a violation. */
export const hasUnterminatedFence = (md) => scan(md).open !== null;

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

/** Remove HTML comments (multi-line; an unterminated one runs to the end). */
export const stripComments = (text) => text.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
