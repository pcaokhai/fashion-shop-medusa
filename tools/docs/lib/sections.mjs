/** Lines of every block whose heading line equals `heading` (exact, trailing space ignored), up to the next `## ` line. */
export function sections(md, heading) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith("## ")) cur = line.trimEnd() === heading ? [] : null;
    if (cur && line.trimEnd() === heading) out.push(cur);
    else if (cur) cur.push(line);
  }
  return out;
}

/** First block for `heading`, or null when absent. */
export const section = (md, heading) => sections(md, heading)[0] ?? null;

/** Drop leading and trailing blank lines; interior blanks stay. */
export function trimBlank(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && lines[a].trim() === "") a++;
  while (b > a && lines[b - 1].trim() === "") b--;
  return lines.slice(a, b);
}
