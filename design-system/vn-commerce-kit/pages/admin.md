# Admin (Medusa Admin routes & widgets) Overrides

> **PROJECT:** VN Commerce Kit · **Page Type:** Back-office. Stories VCK-501..505 (E5).
> Prototype boards: `Admin.dc.html` (desktop), `MobileAdmin.dc.html` (mobile, owner on the go).
> **Visual tokens:** production uses `@medusajs/ui` (MASTER §7). The prototype uses the storefront palette only as a
> stand-in; follow it for **structure, content, states and permissions**, not colours.

## Shell
- Desktop: left navigation (Tổng quan, Đơn hàng, Sản phẩm, Khách hàng, Đối soát, Nhật ký) with counts (pending orders,
  low stock) and a warning badge for open reconciliation rows; top bar with global order search (Enter → Orders),
  notification bell (open recon), current actor + role.
- Mobile: bottom navigation (Tổng quan, Đơn hàng, Đối soát, Thêm). Products/import/bulk slips are desktop-only by
  design; "Thêm" shows role and the latest audit entries (owner only).

## Screens
- **Dashboard (VCK-501)**: range toggle 7/30/90 days (90 = weekly buckets), 4 KPIs with delta vs previous period
  (revenue, orders, AOV, cancel/return rate), revenue bar chart with hover values, payment-method mix bar, "Cần xử lý"
  list linking to pre-filtered views, top-10 products table with share bars. Timezone note Asia/Ho_Chi_Minh.
- **Orders**: status tabs with counts, payment filter, accent-insensitive search; row selection with a bulk toolbar
  (Xác nhận, Tạo vận đơn GHN, In phiếu). Row opens a **right drawer** (mobile: full-screen panel): customer, items,
  payment block explaining the source of truth (IPN / reconciliation, ADR-007), shipping steps, internal note,
  actions by state. Cancel = reason (required) + restock toggle; paid online orders prompt a refund.
- **Packing slips (VCK-503)**: preview of A6 slips — carrier + barcode + tracking, recipient, item checklist with
  SKU/variant, boxed COD amount or "KHÔNG THU TIỀN", handling note.
- **Products + CSV (VCK-502)**: tabs (Tất cả, Đang bán, Nháp, Sắp hết ≤5, Hết hàng), publish switch, export.
  Import wizard: 1 choose file (column spec) → 2 **dry-run** report (totals, per-row issues: row, SKU, column, level,
  message; downloadable) with "skip error rows" switch → 3 background job progress → summary (new/updated).
- **Customers**: spend-sorted table with masked phone, tags (Mới, Thân thiết), "Xem đơn" → Orders filtered.
- **Reconciliation (VCK-505)**: per-source summary (VNPay, VietQR, COD·GHN); filter Cần xử lý/Đã xử lý/Tất cả;
  rows show type badge, reason, expected vs received, version. Resolve dialog (mobile: bottom sheet): action
  (CAPTURE_ORDER, REFUND_PAYMENT, MARK_RESOLVED, assign unmatched transfer) + **required note**; stale version →
  412 message and reload.
- **Audit log (VCK-504)**: owner-only; filters by actor and entity; append-only notice.

## Permissions (VCK-504)
- Owner: everything. Staff (restricted flag): refund and import controls render **locked** (dashed button with lock
  label; action returns 403 toast), audit hidden. Never hide an order action silently — show why it is locked.

## Motion
Minimal (density 8, motion 3): content fade ≤ 260ms, drawer/sheet slide 320ms, bar height transition 420ms, toasts.
