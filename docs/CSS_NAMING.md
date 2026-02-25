# CSS Naming Standard (Prefix-Kebab)

Purpose: keep CSS naming consistent across `src/styles/*` and JSX `className` usage, without changing behavior.

## Scope
- Applies to all classes in:
  - `gun-client/src/styles/*.css`
  - `gun-client/src/components/**/*.js`
- This standard is mandatory for new CSS and for renames during harmonization.

## Canonical Pattern
- Base class pattern: `{domain}-{element}`
  - Examples: `contacts-list`, `chat-input-body`, `taskbar-tab`, `tt-user-node`.
- Modifier pattern: `--{modifier}`
  - Examples: `contacts-item--blocked`, `chat-message--legacy`, `taskbar-tab--active`.

## Rules
1. Domain prefix is required.
2. Kebab-case only (lowercase letters, digits, single hyphen separators).
3. Use `--modifier` for visual/state variants tied to a base class.
4. Avoid generic unprefixed class names (forbidden examples: `active`, `selected`, `disabled`, `title`, `item`).
5. Keep one responsibility per class; no semantic overload.
6. No behavior changes during naming migration.

## Migration Invariants
1. Alias-first rollout is required:
   - Introduce new harmonized selector
   - Keep old selector as alias until JSX is fully migrated
   - Remove alias only after grep/build/regression checks pass
2. No selector specificity increases unless strictly required for parity.
3. No markup restructuring as part of naming migration.

## Validation Checklist
1. `npm -C gun-client run build` succeeds.
2. UI parity is validated using:
   - `gun-client/docs/SESSION_FLOWS.md`
   - Section: `CSS Split Regression Appendix (UI-only)`
3. Grep sanity after alias removal:
   - no remaining references to deprecated class names.
4. Review checklist gate (required before merge):
   - no unprefixed generic state classes in JSX (`active`, `selected`, `disabled`, `primary`, `legacy`, `muted`, `self`, `contact`)
   - no legacy alias selectors left in `src/styles/*` after migration cleanup.

## Recommended Review Commands
- JSX generic-state sanity:
  - `rg -n "className=.*\\b(active|selected|disabled|primary|legacy|muted|self|contact)\\b" gun-client/src/components -g "*.js"`
- Style alias sanity:
  - `rg -n "\\.(contact-item|history-divider|chat-message\\.self|chat-message\\.contact|chat-message\\.legacy|start-btn\\.pressed|taskbar-tab\\.active|dx-button\\.primary)" gun-client/src/styles`

## Notes
- Existing short domain prefixes are valid when already established (`tt-*`, `cp-*`).
- New classes must follow the same domain prefixes used by their owning feature.
