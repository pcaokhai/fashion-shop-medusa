# Design assets: what to read, in what order
Spec first, pictures second, prototype source last. MASTER.md and pages/*.md win over any skill or taste.

1. `MASTER.md` (tokens, components) + `pages/<page>.md` (layout, states, motion) — always.
2. `refs/<page>-desktop.png`, `refs/<page>-mobile.png` — open the one for your page *before* building and compare after (an
   image costs ~1–2k tokens). Needed for: home, product-listing, product-detail, checkout. Add more only if a page needs it.
3. `prototype/<Board>.dc.html` — the interactive prototype source (10 P0 boards, desktop + `Mobile*`). It cannot be opened
   without the canvas runtime and costs ~10k tokens per board: read only its `<x-dc>` markup, only for Vietnamese microcopy
   or states the spec/PNG do not show, at most one board per task. Never copy its CSS or script; rebuild with shadcn + Tailwind.
4. Skills (`frontend-design`, shadcn) help with composition and polish. They must never introduce a new aesthetic direction,
   fonts or colours; the tokens in MASTER.md are the only palette.

Board ↔ page: Main = home · Category = product-listing · Product = product-detail · Search = search · Checkout = checkout
(each with a `Mobile…` twin).
