# Search Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Search results. Rules here override `MASTER.md`.
> Prototype boards: `Search.dc.html`, `MobileSearch.dc.html`. Story VCK-107.

## Behaviour
- **Instant results**: results update while typing (debounce 150ms against the search module); Enter only records the
  query in recents. Matching is accent-insensitive (`ao thun` = `áo thun`) with 1-typo fuzzy fallback; fuzzy hits carry
  a "Gần đúng" badge and a spelling hint.
- Matched substring highlighted (`<mark>`-style token) in names and completions.
- Recent searches stored per device (max 5, clearable). Trending = top 5 queries of the week.

## Layout — desktop
- **Search hero band** (primary-dark surface) with a 68px input, clear button, trending chips.
- Two columns: left rail 260px sticky — *Gợi ý từ khoá* (completions), *Danh mục khớp* (facet with counts, acts as
  filter), *Tìm gần đây*; right — "n kết quả cho “q”", sort pills, 3-column grid, "Xem thêm".
- Empty query: *Top tìm kiếm tuần này* (ranked 1–5, top 3 accent) + *Bán chạy nhất* grid.
- No results: message + suggestion + link to all products.

## Layout — mobile
- Sticky primary-dark header with back + input; completion chips directly under the input.
- Results as compact **list rows** (thumb, category, highlighted name, rating, price), category facet chips,
  "Xem thêm", and "Mở trong trang danh mục để lọc" CTA (hands off to the category page with the query).
- Empty query: recent chips, ranked trends, best-seller rail. Global footer at the end.

## Motion
- MI-22 instant results (content fade/translate 4–6px ≤ 260ms per update, no layout jump), MI-11 wishlist.
