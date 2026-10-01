import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ReleaseError } from "./errors.mjs";

const LINE = /^["']([^"']+)["']:\s*(patch|minor|major)\s*$/;
const PKG = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/;

/** `---\n"pkg": patch|minor|major\n---\n\nsummary` -> { packages, summary }. Anything else throws. */
export function parseChangeset(text, name = "changeset") {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/);
  const fail = (why) => new ReleaseError(`${name}: ${why}`);
  if (lines[0] !== "---") throw fail("missing front-matter ('---' on line 1)");
  const end = lines.indexOf("---", 1);
  if (end < 0) throw fail("unterminated front-matter");
  const packages = lines.slice(1, end).filter((l) => l.trim() !== "").map((l) => {
    const m = l.match(LINE);
    if (!m || !PKG.test(m[1])) throw fail(`bad front-matter line '${l}' (expected "pkg": patch|minor|major)`);
    return { name: m[1], bump: m[2] };
  });
  const dup = packages.find((p, i) => packages.findIndex((q) => q.name === p.name) !== i);
  if (dup) throw fail(`duplicate package '${dup.name}'`);
  if (packages.length === 0) throw fail("front-matter lists no packages");
  const summary = lines.slice(end + 1).join("\n").trim();
  if (summary === "") throw fail("empty summary");
  return { packages, summary };
}

// Only the exact name README.md is skipped; hidden files and lowercase readme.md are parsed (and so fail unless valid).
// Dirent.isFile() is false for symlinks, so a symlinked *.md is refused too.
/** All `*.md` (README.md excluded) in `dir`, sorted. A missing dir is zero changesets; every other problem throws. */
export function readChangesets(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw new ReleaseError(`${dir}: cannot read directory (${e.code ?? e.message})`);
  }
  return entries
    .filter((e) => e.name.endsWith(".md") && e.name !== "README.md")
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .map((e) => {
      if (!e.isFile()) throw new ReleaseError(`${dir}/${e.name}: not a regular file`);
      let text;
      try {
        text = readFileSync(join(dir, e.name), "utf8");
      } catch (err) {
        throw new ReleaseError(`${dir}/${e.name}: cannot read file (${err.code ?? err.message})`);
      }
      return { file: e.name, ...parseChangeset(text, `${dir}/${e.name}`) };
    });
}
