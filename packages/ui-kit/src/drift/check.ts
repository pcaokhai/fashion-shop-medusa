export interface ParsedTokens {
  hasColorReset: boolean;
  /** `--color-*` is the first declaration inside @theme */
  resetFirst: boolean;
  /** Non-comment, non-whitespace CSS outside the @theme block */
  outside: string;
  tokens: Record<string, string>;
}

/** Reads the single `@theme { ... }` block of tokens.css. Throws if there is none. */
export function parseTokensCss(css: string): ParsedTokens {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const m = /@theme\s*\{([\s\S]*?)\}/.exec(bare);
  if (!m) throw new Error("tokens.css: no @theme block");
  const tokens: Record<string, string> = {};
  let hasColorReset = false;
  let resetFirst = false;
  let first = true;
  for (const decl of (m[1] as string).split(";")) {
    const d = /^\s*(--[a-z0-9*-]+)\s*:\s*([\s\S]+?)\s*$/.exec(decl);
    if (!d) continue;
    const [name, value] = [d[1] as string, d[2] as string];
    if (first) resetFirst = name === "--color-*" && value === "initial";
    first = false;
    if (name === "--color-*") hasColorReset = value === "initial";
    else tokens[name] = value;
  }
  const outside = (bare.slice(0, m.index) + bare.slice(m.index + m[0].length)).trim();
  return { hasColorReset, resetFirst, outside, tokens };
}

/** Returns human-readable problems; empty = tokens.css matches `expected` exactly (hex case-insensitive). */
export function checkTokens(css: string, expected: Record<string, string>): string[] {
  const { hasColorReset, resetFirst, outside, tokens } = parseTokensCss(css);
  const problems: string[] = [];
  if (!hasColorReset) problems.push("--color-*: initial missing");
  else if (!resetFirst) problems.push("--color-*: initial must be the first declaration");
  if (outside) problems.push(`CSS outside @theme: ${outside.slice(0, 40)}`);
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
