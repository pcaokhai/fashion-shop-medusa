// vck/no-raw-values: fail raw colours and px lengths in storefront source; use design tokens (var(--…), bg-primary).
// Visits Literal (strings, JSX attribute strings), TemplateElement and JSXText only; comments are never visited.
// Allowed: var(--…), currentColor, transparent, inherit, 0/1/2px, color-mix() over var(--…).
// Colour functions whose FIRST argument is var( or "from var(" are allowed; hex/px elsewhere in the string still flag.
// Named colours (red, rebeccapurple, text-[red], fill="red") are NOT detected: known limit, out of AC2 scope.
// Known false positives (do NOT get clever): href="#add", "Đơn #1001", "#decade". Escape hatch (a reason is convention only, not enforced):
//   // eslint-disable-next-line vck/no-raw-values -- reason      (or write {"#"}{id})

const HEX = /(?<![\w&/])#([0-9a-fA-F]{3,8})(?![\w-])/g;
const COLOUR_FN = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/gi;
const VAR_FIRST = /\s*(?:from\s+)?var\(/iy; // rgb(var(--x)), oklch(from var(--x) l c h / .5): allowed
const PX = /(?<![\w.])-?(?:\d+(?:\.\d+)?|\.\d+)px(?![\w])/gi;
const COLOR_MIX = /color-mix\s*\(((?:[^()]|\([^()]*\))*)\)/gi;
const NAMED = /(?<![\w-])(?:black|white|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|cyan|magenta)(?![\w-])/i;
const ALLOWED_PX = new Set([0, 1, 2]);
const HEX_LENGTHS = new Set([3, 4, 6, 8]);

function* matches(re, text) {
  for (const m of text.matchAll(re)) yield m;
}

export function findRawValues(text) {
  const out = [];
  for (const m of matches(HEX, text)) {
    if (HEX_LENGTHS.has(m[1].length)) out.push({ kind: "hex", value: m[0], index: m.index });
  }
  for (const m of matches(COLOUR_FN, text)) {
    VAR_FIRST.lastIndex = m.index + m[0].length;
    if (!VAR_FIRST.test(text)) out.push({ kind: "colour-fn", value: m[0], index: m.index });
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
