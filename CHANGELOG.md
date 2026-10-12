# Changelog

All notable changes to `@polyus-studio/vera-cmp` are documented here.

## 0.1.3 — 2026-10-12

### Fixed

- **GPC-denied categories were force-accepted.** They were marked `readOnly`
  in vanilla-cookieconsent, which accepts read-only categories on every
  `acceptCategory()` call — "Reject all" and closing the banner included — so
  visitors sending a Global Privacy Control signal ended up with the denied
  categories (default: `marketing`) accepted, and their
  `<script type="text/plain" data-category>` tags executed. GPC reconciliation
  of stored consent re-added them the same way. Now, while GPC is active:
  - a denied category is never accepted by "Accept all", "Reject all",
    closing the banner, `acceptCategory()` calls or stored consent; stored
    consent that accepted it is overridden and re-persisted;
  - `lockDeniedCategories: true` (default) shows the denied toggles off and
    disabled in the preferences modal;
  - `lockDeniedCategories: false` lets the visitor switch a denied category on
    in the preferences modal and save; that explicit choice is honoured and
    persisted (`data.veraCmpGpcOptIn` in the consent cookie). "Accept all"
    alone never enables it;
  - with `manageScriptTags: true`, script tags of denied categories are held
    back before vanilla-cookieconsent starts and only run after an explicit
    opt-in;
  - consumer `onFirstConsent` / `onConsent` / `onChange` hooks, built-in
    loaders and Google Consent Mode only see the enforced state.
- `VERSION` now matches the package version (it still read `0.1.0`).

### Added

- `trackers.yandexMetrica`: Yandex Metrica cookies (`_ym_uid`, `_ym_d`,
  `_ym_isad`, `_ym_visorc` and other `_ym*`) are erased by
  `resetPrivacyConsent()`, and cleared on category withdrawal when the tracker
  is declared (e.g. when Metrica is loaded via script tags). There is no
  built-in Metrica loader.
- The GPC notice explains whether denied categories can still be enabled.

### Changed

- The default analytics category description (en/ru) no longer claims that
  all data is aggregated or anonymised.
