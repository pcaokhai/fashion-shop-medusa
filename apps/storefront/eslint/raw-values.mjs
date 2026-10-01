// vck/no-raw-values: fail raw colours and px lengths in storefront source; use design tokens (var(--…), bg-primary).
// Visits Literal (strings, JSX attribute strings), TemplateElement and JSXText only; comments are never visited.
// Allowed: var(--…), currentColor, transparent, inherit, 0/1/2px, color-mix() over var(--…).
// Colour functions whose FIRST argument is var( or "from var(" are allowed, unless that var() has a numeric fallback or
// comma syntax with bare numbers follows it. Accepted misses (tested): relative colour with literal channels, CSS escapes.
// Named colours (red, rebeccapurple, text-[red], fill="red") are NOT detected: known limit, out of AC2 scope.
// Known false positives (do NOT get clever): href="#add", "Đơn #1001", "#decade". Escape hatch (a reason is convention only, not enforced):
//   // eslint-disable-next-line vck/no-raw-values -- reason      (or write {"#"}{id})

const HEX = /(?<![\w&/])#([0-9a-fA-F]{3,8})(?![\w-])/g;
const COLOUR_FN = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/gi;
const VAR_FIRST = /\s*(from\s+)?var\(/iy; // rgb(var(--x)), oklch(from var(--x) l c h / .5): allowed
const BARE_NUM = /(?<![\w.#-])[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?![\w.-])/;
const SCAN_LIMIT = 256; // bounds the paren scan so hostile input stays linear
const PX = /(?<![\w.])-?(?:\d+(?:\.\d+)?|\.\d+)px(?![\w])/gi;
const COLOR_MIX = /color-mix\s*\(((?:[^()]|\([^()]*\))*)\)/gi;
const NAMED = /(?<![\w-])(?:black|white|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|cyan|magenta)(?![\w-])/i;
const ALLOWED_PX = new Set([0, 1, 2]);
const HEX_LENGTHS = new Set([3, 4, 6, 8]);

function* matches(re, text) {
  for (const m of text.matchAll(re)) yield m;
}

// Index of the ")" closing the "(" at `open` (within SCAN_LIMIT), else -1.
function closeParen(text, open) {
  let depth = 0;
  for (let i = open; i < Math.min(text.length, open + SCAN_LIMIT); i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

// Drop nested var(...)/calc(...) groups, keeping the rest for number scanning.
function stripGroups(s) {
  let out = s;
  for (let m = /(?:var|calc)\(/i.exec(out); m; m = /(?:var|calc)\(/i.exec(out)) {
    const close = closeParen(out, m.index + m[0].length - 1);
    out = out.slice(0, m.index) + " " + (close === -1 ? "" : out.slice(close + 1));
  }
  return out;
}

// `args` starts just after the colour function's "(". Raw if it does not lead with var(...)/from var(...),
// if that var's fallback holds a bare number, or if comma syntax follows it with bare numbers.
function colourArgsAreRaw(args) {
  VAR_FIRST.lastIndex = 0;
  const v = VAR_FIRST.exec(args);
  if (!v) return true;
  const open = v[0].length - 1;
  const close = closeParen(args, open);
  if (close === -1) return false;
  const inner = args.slice(open + 1, close);
  const comma = inner.indexOf(",");
  if (comma !== -1 && BARE_NUM.test(stripGroups(inner.slice(comma + 1)))) return true;
  if (v[1]) return false; // relative colour: literal channels are an accepted miss (R-009-7)
  const end = closeParen(`(${args}`, 0);
  const rest = args.slice(close + 1, end === -1 ? close + 1 : end - 1);
  return /^\s*,/.test(rest) && BARE_NUM.test(stripGroups(rest));
}

export function findRawValues(text) {
  const out = [];
  for (const m of matches(HEX, text)) {
    if (HEX_LENGTHS.has(m[1].length)) out.push({ kind: "hex", value: m[0], index: m.index });
  }
  for (const m of matches(COLOUR_FN, text)) {
    if (colourArgsAreRaw(text.slice(m.index + m[0].length, m.index + m[0].length + SCAN_LIMIT))) out.push({ kind: "colour-fn", value: m[0], index: m.index });
  }
  for (const m of matches(PX, text)) {
    if (!ALLOWED_PX.has(Math.abs(parseFloat(m[0])))) out.push({ kind: "px", value: m[0], index: m.index });
  }
  for (const m of matches(COLOR_MIX, text)) {
    if (NAMED.test(m[1])) out.push({ kind: "color-mix", value: m[0], index: m.index });
  }
  return out.sort((a, b) => a.index - b.index);
}

const rule = {
  meta: {
    type: "problem",
    schema: [],
    messages: { raw: "Raw {{kind}} value {{value}}: use a design token (var(--…) or a token utility)." },
  },
  create(context) {
    const check = (node, text) => {
      for (const { kind, value } of findRawValues(text)) context.report({ node, messageId: "raw", data: { kind, value } });
    };
    return {
      Literal: (node) => typeof node.value === "string" && check(node, node.value),
      TemplateElement: (node) => check(node, node.value.cooked ?? node.value.raw),
      JSXText: (node) => check(node, node.value),
    };
  },
};

export default { rules: { "no-raw-values": rule } };
