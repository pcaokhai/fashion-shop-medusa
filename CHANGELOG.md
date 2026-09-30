# Changelog
All notable changes to this project are documented here (Keep a Changelog, SemVer).
Detailed notes per release live in `docs/releases/`.

## [Unreleased]
### Added
- Technical documentation pack, contracts and Claude Code setup.
- Curated UI UX Pro Max design system (MASTER + page overrides) and motion system (docs/13).
- Page overrides `pages/search.md` and `pages/admin.md`; category tint tokens, global footer, sticky-footer shell and
  popover specs in MASTER; MI-21..MI-24; interactive prototype reference (docs/13 §3.1).
- Page specs `order-lookup.md` (incl. contract gap for a public lookup endpoint), `content-policy.md`,
  `system-states.md`, `notifications.md`; prototype rows 5–6.
- Motion layer v2 (docs/13 §4.6, MI-25..MI-33, coverage matrix §5.1) using CSS scroll-driven animations; page specs
  `flash-sale.md` and `about.md`; demo-mode banner (VCK-806) on home and admin.
- Guest order access (ADR-014, docs/14): `store-order-lookup` endpoints, schemas and fixtures; event
  `vck.order.guest_cancelled`; table `guest_access_event`; stories VCK-406/407 (R1.1, Sprint 8) and VCK-408 (option B,
  backlog); FR-17; TS-20..22; risks R-12/R-13; ORDER_CANCELLED notification.
### Changed
- `getOrderTracking` documented as signed-in owner only; guest access goes through the new module.
- Motion principles 2 and 5 widened: scaleX bars; scroll reveals allowed on content pages, still banned on PLP/search
  grids, checkout and admin.
- Category: horizontal filter bar with popovers, subcategory tiles, promo tile, numbered pagination (was left rail).
- Search: instant results with completion rail (was dropdown suggestions).
- Account: horizontal tabs, order tables and parcel route map (was side navigation); mobile uses top pill tabs.
- Checkout explicitly excludes the global footer; desktop step-card layout and payment result states documented
  (pending IPN, failed/cancelled with response code, VietQR expiry).
