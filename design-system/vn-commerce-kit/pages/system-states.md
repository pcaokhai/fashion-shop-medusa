# System & Error States Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Error / status. Rules here override `MASTER.md`.
> Prototype boards: `States.dc.html`, `MobileStates.dc.html` (demo switcher bar at the top is prototype-only).

| State | HTTP | Header / footer | Content |
| --- | --- | --- | --- |
| Not found | 404 | Full | Playful "4 [bag] 4" mark, headline, search entry (links to search page), category chips, 4 suggested products |
| Product discontinued | 410 | Full | Greyed product image + "Ngừng kinh doanh" badge, explanation, "Báo tôi khi có mẫu tương tự", category link, 4 similar products; removed from sitemap, no blanket redirect to home |
| Maintenance | 503 + `Retry-After` | Logo-only header, minimal legal strip | Rotating gear, message that existing orders are still processed, countdown to planned reopening, "Báo tôi khi mở lại" (Zalo), Zalo OA + hotline, status page link |
| Server error | 500 | Full header, minimal strip | Message that the cart is kept, "Thử lại" with spinner, second failure shows an alert, error ID with copy for support; success state "Đã kết nối lại" |

Rules: never show stack traces or raw codes other than the support error ID; every state has a clear next action;
error pages are `noindex` except 410 content which stays crawlable until dropped. Motion is decorative only (bob/rotate)
and disabled under reduced motion.
