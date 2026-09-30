export interface ParsedTokens { hasColorReset: boolean; tokens: Record<string, string> }

/** Reads the single `@theme { ... }` block of tokens.css. Throws if there is none. */
export function parseTokensCss(css: string): ParsedTokens {
  const m = /@theme\s*\{([\s\S]*?)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  if (!m) throw new Error("tokens.css: no @theme block");
  const tokens: Record<string, string> = {};
  let hasColorReset = false;
  for (const decl of (m[1] as string).split(";")) {
    const d = /^\s*(--[a-z0-9*-]+)\s*:\s*([\s\S]+?)\s*$/.exec(decl);
    if (!d) continue;
    const [name, value] = [d[1] as string, d[2] as string];
    if (name === "--color-*") hasColorReset = value === "initial";
    else tokens[name] = value;
  }
  return { hasColorReset, tokens };
}

/** Returns human-readable problems; empty = tokens.css matches `expected` exactly (hex case-insensitive). */
export function checkTokens(css: string, expected: Record<string, string>): string[] {
  const { hasColorReset, tokens } = parseTokensCss(css);
  const problems: string[] = [];
  if (!hasColorReset) problems.push("--color-*: initial missing");
  const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
  for (const [name, want] of Object.entries(expected)) {
    const got = tokens[name];
    if (got === undefined) problems.push(`missing ${name}`);
    else if (isHex(want) ? got.toLowerCase() !== want.toLowerCase() : got !== want) {
      problems.push(`${name}: expected ${want}, got ${got}`);
    }
  }
  for (const name of Object.keys(tokens)) if (!(name in expected)) problems.push(`unknown ${name}`);
  return problems;
}
