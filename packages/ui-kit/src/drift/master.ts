// Fail-closed parser for design-system/vn-commerce-kit/MASTER.md (§1-§3) and docs/13 §4.2.
export interface Category { key: string; tint: string; ink: string }
export interface Master {
  colors: Record<string, string>;
  categories: Category[];
  surfaceDark: string;
  scale: Record<string, string>;
  space: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, string>;
  leading: { body: string; heading: string };
  tracking: string;
  containerMax: string;
  font: string;
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

function section(text: string, n: number): string {
  const m = new RegExp(`^## ${n}\\. .*$`, "m").exec(text);
  if (!m) throw new Error(`MASTER §${n} not found`);
  const rest = text.slice(m.index + m[0].length);
  const next = /^## /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

function need(re: RegExp, text: string, what: string): RegExpExecArray {
  const m = re.exec(text);
  if (!m) throw new Error(`MASTER: ${what} not found`);
  return m;
}

function tableRows(sec: string): string[][] {
  return sec
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((cells) => !/^-+$/.test(cells[0] ?? "") && cells[0] !== "Role" && cells[0] !== "Token");
}

const unwrap = (s: string): string | undefined => /^`([^`]+)`$/.exec(s)?.[1];

function parseColors(s1: string): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const cells of tableRows(s1)) {
    const hex = unwrap(cells[1] ?? "");
    const name = unwrap(cells[2] ?? "");
    if (!hex || !HEX6.test(hex) || !name || !/^--color-[a-z-]+$/.test(name)) {
      throw new Error(`MASTER §1: malformed colour row: ${cells.join(" | ")}`);
    }
    colors[name] = hex;
  }
  if (Object.keys(colors).length === 0) throw new Error("MASTER §1: zero colour rows");
  return colors;
}

function parseCategories(s1: string): Category[] {
  const pair = "`(#[0-9A-Fa-f]{6})`/`(#[0-9A-Fa-f]{6})`";
  const out: Category[] = [...s1.matchAll(new RegExp(`--color-cat-([a-z]+)\` ${pair}`, "g"))].map(
    (m) => ({ key: m[1] as string, tint: m[2] as string, ink: m[3] as string }),
  );
  const all = need(new RegExp(`all-products ${pair}`), s1, "all-products pair");
  out.push({ key: "all", tint: all[1] as string, ink: all[2] as string });
  if (out.length < 2) throw new Error("MASTER §1: zero category tints");
  return out;
}

function expand(cells: string[]): Record<string, string> {
  const m = /^--([a-z]+)-(.+)$/.exec(unwrap(cells[0] ?? "") ?? "");
  const vals = /^([\d/]+) px$/.exec(cells[1] ?? "");
  if (!m || !vals) throw new Error(`MASTER §3: malformed row: ${cells.join(" | ")}`);
  const names = (m[2] as string).split("/");
  const nums = (vals[1] as string).split("/");
  if (names.length !== nums.length) throw new Error(`MASTER §3: name/value count mismatch: ${cells[0]}`);
  return Object.fromEntries(names.map((n, i) => [`--${m[1]}-${n}`, `${nums[i]}px`]));
}

function parseElevation(s3: string) {
  const space: Record<string, string> = {};
  const radius: Record<string, string> = {};
  const shadow: Record<string, string> = {};
  for (const cells of tableRows(s3)) {
    const name = unwrap(cells[0] ?? "") ?? "";
    if (name.startsWith("--space-")) Object.assign(space, expand(cells));
    else if (name.startsWith("--radius-")) Object.assign(radius, expand(cells));
    else if (name.startsWith("--shadow-")) {
      const v = unwrap(cells[1] ?? "");
      if (!v) throw new Error(`MASTER §3: malformed shadow row: ${cells.join(" | ")}`);
      shadow[name] = v;
    } else throw new Error(`MASTER §3: unknown row: ${cells.join(" | ")}`);
  }
  for (const [k, o] of Object.entries({ space, radius, shadow })) {
    if (Object.keys(o).length === 0) throw new Error(`MASTER §3: zero ${k} rows`);
  }
  return { space, radius, shadow };
}

export function parseMaster(text: string): Master {
  const s1 = section(text, 1);
  const s2 = section(text, 2);
  const s3 = section(text, 3);
  const colors = parseColors(s1);
  const scaleLine = need(/^- Scale \(rem[^)]*\): (.*)$/m, s2, "type scale").at(1) as string;
  const scale = Object.fromEntries(
    [...scaleLine.matchAll(/([\d.]+) ([a-z0-9]+)/g)].map((m) => [m[2] as string, `${m[1]}rem`]),
  );
  if (Object.keys(scale).length === 0) throw new Error("MASTER §2: zero scale steps");
  const lh = need(/Line-height: body ([\d.]+), headings ([\d.]+); letter-spacing headings (-?[\d.]+em)/, s2, "line-height");
  const family = need(/^- Family: \*\*([^*]+)\*\*.*fallback `([^`]+)`/m, s2, "font family");
  return {
    colors,
    categories: parseCategories(s1),
    surfaceDark: need(/Surface dark `(#[0-9A-Fa-f]{6})`/, s1, "surface dark").at(1) as string,
    scale,
    ...parseElevation(s3),
    leading: { body: lh[1] as string, heading: lh[2] as string },
    tracking: lh[3] as string,
    containerMax: need(/Container max (\d+px)/, s3, "container max").at(1) as string,
    font: `"${family[1]}", ${family[2]}`,
  };
}

/** docs/13 §4.2 `--dur-*` / `--ease-*` rows. */
export function parseMotion(docs: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of docs.matchAll(/^\| `(--(?:dur|ease)-[a-z]+)` \| `?([^|`]+?)`? \|/gm)) {
    out[m[1] as string] = (m[2] as string).trim();
  }
  if (Object.keys(out).length === 0) throw new Error("docs/13 §4.2: zero motion tokens");
  return out;
}

/** Every token tokens.css must declare, with its exact expected value. */
export function expectedTokens(m: Master, motion: Record<string, string>): Record<string, string> {
  const t: Record<string, string> = { ...m.colors };
  for (const c of m.categories) {
    t[`--color-cat-${c.key}`] = c.tint;
    t[`--color-cat-${c.key}-ink`] = c.ink;
  }
  t["--color-surface-dark"] = m.surfaceDark;
  // ponytail: on-surface-dark is not named in MASTER; it is the page background tone (same as the all-products ink).
  if (m.colors["--color-background"]) t["--color-on-surface-dark"] = m.colors["--color-background"];
  for (const [k, v] of Object.entries(m.scale)) t[`--text-${k}`] = v;
  t["--leading-body"] = m.leading.body;
  t["--leading-heading"] = m.leading.heading;
  t["--tracking-heading"] = m.tracking;
  t["--layout-max"] = m.containerMax;
  t["--font-sans"] = m.font;
  return { ...t, ...m.space, ...m.radius, ...m.shadow, ...motion };
}
