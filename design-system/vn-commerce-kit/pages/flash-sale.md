# Flash Sale Campaign Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Campaign (vibrant blocks allowed). Rules here override `MASTER.md`.
> Prototype boards: `FlashSale.dc.html`, `MobileFlashSale.dc.html`. Entry points: header "Flash sale", home flash band,
> category promo tile.

## Behaviour
- Four daily slots (09:00 live, 12:00, 20:00, 00:00 next day). Live slot: countdown to end + "Mua ngay"; upcoming slots:
  countdown to start + "Nhắc tôi" (Zalo ZNS 5 min before, requires consent).
- Limits: 1 unit per SKU per customer (phone + account); buying **reserves** stock for 10 minutes (cart hold), then
  releases — no phantom stock. Flash price only with VNPay/VietQR; not combinable with codes. Rules shown on page.
- Stock bar text: "Đã bán x%" → "Chỉ còn n suất" (≤ 5) → "Đã hết suất"; "SẮP HẾT" badge at ≥ 80% sold.
- Server is the source of truth for time and stock (clock skew safe); UI re-syncs every minute and on focus.

## Layout
- Desktop: dark hero (headline, rules summary, flip countdown with h/m/s labels), sticky slot bar under the header with a
  sliding indicator and a pulsing live dot, category chips + deal count, 4-column deal cards, "Mở bán tiếp theo" teaser
  (4 cards with reminders), 3 rule cards, floating cart pill "Đã giữ n suất — Thanh toán ngay", global footer.
- Mobile: compact hero + countdown, sticky slot bar below the header, snap chips, 2-column cards, horizontal teaser row,
  rules in an accordion, cart pill docked at the bottom.

## Motion
MI-05 flip digits (only changed digits animate), MI-25/29 hero + sections, MI-32 stock bars (`scaleX`), MI-33 bell ring,
claimed pop, cart pill slide, "SẮP HẾT" pulse. Prices never animate.
