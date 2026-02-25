# CSS Class Map (Old -> Target)

Purpose: decision-complete mapping for the CSS naming harmonization scope.

Status:
- Step 5 cleanup complete.
- Old alias selectors removed for migrated domains.
- This map remains as migration reference and historical record.

Legend:
- `stable`: blijft ongewijzigd.
- `rename`: wordt vervangen door target.
- `alias-only tijdelijk`: blijft tijdelijk als alias tijdens migratie.
- `verwijderen in cleanup`: verwijderen na volledige migratie.

## 1) Global Rules

### Stable prefix families
- `contacts-*` -> `stable`
- `chat-*` -> `stable`
- `taskbar-*` -> `stable`
- `systray-*` -> `stable`
- `tt-*` -> `stable`
- `cp-*` -> `stable`
- `xp-*` -> `stable`
- `browser-*`, `notepad-*`, `paint-*`, `media-*`, `calc-*`, `pinball-*`, `tictactoe-*`, `wizard-*`, `dropdown-*`, `modal-*`, `toast-*`, `pane-*` -> `stable`

### Canonical state convention
- State classes move to `--modifier` on the owning block.
- Bare/generic state classes (`active`, `disabled`, `selected`, `muted`, ...) are deprecated.

---

## 2) Shell / Pane / Taskbar

| Old | Target | Type |
|---|---|---|
| `maximized` (on `pane-frame`) | `pane-frame--maximized` | rename |
| `inactive` (on `pane-header`) | `pane-header--inactive` | rename |
| `minimize` (on `pane-btn`) | `pane-btn--minimize` | rename |
| `maximize` (on `pane-btn`) | `pane-btn--maximize` | rename |
| `close` (on `pane-btn`) | `pane-btn--close` | rename |
| `active` (on `taskbar-tab`) | `taskbar-tab--active` | rename |
| `unread` (on `taskbar-tab`) | `taskbar-tab--unread` | rename |
| `flashing` (on `taskbar-tab`) | `taskbar-tab--flashing` | rename |
| `disabled` (on `scanlines-overlay`) | `scanlines-overlay--disabled` | rename |

Notes:
- `type-*` (`type-contacts`, `type-conversation`, ...) blijft `stable` (runtime pane type contract).

---

## 3) Contacts Domain

| Old | Target | Type |
|---|---|---|
| `contact-item` | `contacts-item` | rename |
| `contact-item-blocked` | `contacts-item contacts-item--blocked` | rename |
| `contact-avatar-thumb` | `contacts-item-avatar-thumb` | rename |
| `contact-item-details` | `contacts-item-details` | rename |
| `contact-inline` | `contacts-item-inline` | rename |
| `contact-name` | `contacts-item-name` | rename |
| `contact-status-label` | `contacts-item-status-label` | rename |
| `contact-personal-msg` | `contacts-item-personal-msg` | rename |
| `contact-status-dot` | `contacts-item-status-dot` | rename |
| `contact-avatar-wrapper` | `contacts-item-avatar-wrapper` | rename |
| `active` (on `contacts-menu-item`) | `contacts-menu-item--active` | rename |
| `blocked` (contact state class in JSX) | `contacts-item--blocked` | rename |
| `online` (contact state class in JSX) | `contacts-item--online` | rename |
| `offline` (contact state class in JSX) | `contacts-item--offline` | rename |

---

## 4) Conversation Domain

| Old | Target | Type |
|---|---|---|
| `legacy` (on `chat-message`) | `chat-message--legacy` | rename |
| `self` (on `chat-message`) | `chat-message--self` | rename |
| `contact` (on `chat-message`) | `chat-message--contact` | rename |
| `disabled` (on `chat-toolbar-btn`) | `chat-toolbar-btn--disabled` | rename |
| `nudge-active` | `chat-input-tool--nudge-active` | rename |
| `history-divider` | `chat-history-divider` | rename |
| `message-header` | `chat-message-header` | rename |
| `message-content` | `chat-message-content` | rename |
| `typing` (dynamic typing state class) | `chat-typing--active` | rename |

Notes:
- `typing-indicator` and `typing-indicator-bar` blijven `stable` in deze scope.

---

## 5) Dropdown / Modal / Toast / Generic UI

| Old | Target | Type |
|---|---|---|
| `active` (on `contacts-menu-item` from `DropdownMenu`) | `contacts-menu-item--active` | rename |
| `dropdown-item-disabled` | `dropdown-item--disabled` | rename |
| `dropdown-item-checked` | `dropdown-item--checked` | rename |
| `toast-closing` | `toast-notification--closing` | rename |
| `primary` (on `dx-button`) | `dx-button--primary` | rename |
| `secondary` (on `dx-button`) | `dx-button--secondary` | rename |
| `pressed` (on `dx-button`) | `dx-button--pressed` | rename |
| `disabled` (generic) | owner-specific `--disabled` variant | rename |

---

## 6) Apps Domain (Control, Paint, TeamTalk, Calculator)

| Old | Target | Type |
|---|---|---|
| `cp-avatar-selected` | `cp-avatar-option--selected` | rename |
| `selected` (on `paint-grid-tool`) | `paint-grid-tool--selected` | rename |
| `selected` (on `paint-width-option`) | `paint-width-option--selected` | rename |
| `selected` (on `paint-color-swatch`) | `paint-color-swatch--selected` | rename |
| `active` (on `paint-tool-btn`) | `paint-tool-btn--active` | rename |
| `tt-muted` | `tt-mute-btn--muted` | rename |
| `tt-speaking` | `tt-user-node--speaking` | rename |
| `tt-tab-active` | `tt-tab--active` | rename |
| `muted` (on call button) | `call-btn--muted` | rename |
| `call-accept` | `call-btn--accept` | rename |
| `call-reject` | `call-btn--reject` | rename |
| `call-hangup` | `call-btn--hangup` | rename |
| `function` (calculator button) | `calc-btn--function` | rename |
| `operator` (calculator button) | `calc-btn--operator` | rename |
| `memory` (calculator button) | `calc-btn--memory` | rename |
| `equals` (calculator button) | `calc-btn--equals` | rename |

---

## 7) Alias Policy (Implementation contract)

For every `rename` entry:
1. Add target selector in CSS.
2. Keep old selector as temporary alias (`alias-only tijdelijk`).
3. Migrate JSX to target class.
4. Remove old alias in cleanup step.

Current state:
- Alias cleanup finished for mapped classes in this file.
- New naming is now canonical (`prefix-kebab` + `--modifier`).

---

## 8) Cleanup Targets (Step 5)

Mark these as `verwijderen in cleanup` once grep confirms no references:
- bare state classes: `active`, `disabled`, `selected`, `muted`, `legacy`, `self`, `contact`
- old generic conversation classes: `history-divider`, `message-header`, `message-content`
- old contact item family: `contact-*` item classes listed above

---

## 9) Grep Completion Criteria

After Step 5, these patterns must not appear in JSX/CSS:
- `className=.*\\bactive\\b` (without domain prefix)
- `className=.*\\bselected\\b` (without domain prefix)
- `className=.*\\bdisabled\\b` (without domain prefix)
- `className=.*\\blegacy\\b` (without domain prefix)
- `className=.*\\bmuted\\b` (without domain prefix)

Completion:
- Criteria passed in the harmonization scope.
