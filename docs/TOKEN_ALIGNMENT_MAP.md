# Token Alignment Map

Purpose: define safe token migration targets before touching CSS rules.
Scope: static-value alignment only. No behavior or layout changes.

## Source of Truth
- Tokens file: `gun-client/src/styles/00-tokens.css`
- UI naming rules: `gun-client/docs/CSS_NAMING.md`
- Regression checklist: `gun-client/docs/SESSION_FLOWS.md`

## Candidate Categories

### A) Safe now (high confidence)
1. Generic text sizes in shell/pane controls:
   - target tokens: `--ui-font-size`, `--ui-font-size-md`, `--ui-font-size-sm`, `--ui-font-size-xs`
2. Generic text colors that already map to global links:
   - target tokens: `--link-color`, `--link-color-light`
3. Generic form borders/backgrounds in shared controls:
   - target tokens: `--input-border`, `--btn-border`, `--btn-gradient-a`, `--btn-gradient-b`

### B) Needs domain review (do not change blindly)
1. XP chrome gradients and titlebar stops.
2. Taskbar/start button micro-contrast values.
3. Pane-specific hardcoded spacing and border widths.

### C) Out of scope for token alignment
1. Dynamic runtime inline styles (live status color, widths, positions, timing values).
2. Behavioral classes (`--active`, `--unread`, `--minimized`) semantics.
3. Any class requiring JSX logic changes.

## Migration Invariant
If there is any doubt about XP visual parity, keep the literal value and mark it for later review.

## Completed In This Pass
1. Font-size token alignment:
   - `11px` -> `var(--ui-font-size)`
   - `10px` -> `var(--ui-font-size-sm)`
   - `9px` -> `var(--ui-font-size-xs)`
2. Added neutral text tokens in `00-tokens.css`:
   - `--text-muted`, `--text-secondary`, `--text-faint`, `--text-disabled`, `--text-success`
3. Safe color alignment for static text-only rules in Contacts/Conversation/Modals/ControlPane.

## Verification Commands
1. Build:
   - `npm -C gun-client run build`
2. Quick token usage check:
   - `rg -n "var\\(--(ui-font-size|ui-font-size-sm|ui-font-size-xs|text-muted|text-secondary|text-faint|text-disabled|text-success)\\)" gun-client/src/styles`
3. Literal fallback audit (remaining hardcoded muted grays):
   - `rg -n "#666|#444|#999|#808080|#2a7d2a" gun-client/src/styles`

## Exit Criteria
1. Build succeeds.
2. `SESSION_FLOWS.md` scenario 16 visual guard passes.
3. No XP chrome drift observed in taskbar/startmenu/panes.
