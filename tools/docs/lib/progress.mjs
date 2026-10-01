import { readText } from "./release-doc.mjs";
import { sections, unterminated, trimBlank } from "./sections.mjs";

export const NOW_LIMIT = 15;
const PATH = "docs/progress/PROGRESS.md";

/** PROGRESS "## Now" block must exist once, be non-empty and at most 15 lines; returns { violations, lines }. */
export function checkProgress(root) {
  const r = readText(root, PATH);
  if (r.error) return { violations: [`${PATH}: ${r.error}`], lines: 0 };
  const md = r.md;
  const open = unterminated(md);
  if (open) return { violations: [`${PATH}: unterminated ${open}`], lines: 0 };
  const blocks = sections(md, "## Now");
  if (blocks.length !== 1) return { violations: [`${PATH}: expected exactly one '## Now' heading, found ${blocks.length}`], lines: 0 };
  const lines = trimBlank(blocks[0]).length;
  if (lines === 0) return { violations: [`${PATH}: '## Now' block is empty`], lines };
  if (lines > NOW_LIMIT) return { violations: [`${PATH}: '## Now' has ${lines} lines, limit is ${NOW_LIMIT}`], lines };
  return { violations: [], lines };
}
