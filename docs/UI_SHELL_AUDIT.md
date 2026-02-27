# UI Shell + Power + Contacts Audit Baseline

Purpose: baseline lock for the Shell + Power + Contacts UI guideline scope.

Sources:
- `gun-client/docs/UI-guideline.md`
- `gun-client/src/styles/00-tokens.css`

## 1. State Matrix

| Surface | normal | hover | pressed | active | inactive | disabled |
|---|---|---|---|---|---|---|
| `pane-header` + frame | required | n/a | n/a | required | required | n/a |
| `pane-btn` (min/max/close) | required | required | required | n/a | n/a | optional |
| `taskbar-tab` | required | required | required | required | n/a | optional |
| `start-menu` item | required | required | optional | optional | n/a | optional |
| `ctx-menu` item | required | required | optional | optional | n/a | required |
| `systray` menu item | required | required | optional | optional | n/a | optional |
| `welcome/logoff/shutdown` shells | required | n/a | n/a | required | optional | n/a |

Legend:
- `required`: must be visually distinguishable.
- `optional`: only where the component supports this state.
- `n/a`: not applicable.

## 2. Baseline Checkpoints

1. Pane chrome:
- `pane-header` active/inactive contrast is clear.
- Frame and titlebar dim together for inactive panes.

2. Taskbar tabs:
- `normal`, `hover`, `pressed`, `active`, `unread` are distinguishable.

3. Start/context menus:
- Hover fill, separators, and left accent are consistent.
- Item metrics are coherent between startmenu and contextmenu.

4. Systray menu:
- Readability and status colors remain clear in at least `blauw`, `klassiek`, and `zune`.

5. Power flow:
- `welcome`, `logoff`, and `shutdown` use one visual language.
- Fade/transition feels continuous without hard jumps.

## 3. Step 1 Acceptance

1. Baseline checklist is explicit and complete.
2. No runtime logic change required.

## 4. Reviewer Contract Checks (Step 6 Lock)

1. Updated Shell/Power CSS uses current runtime tokens from `src/styles/00-tokens.css` where available.
2. Hardcoded values are only kept as explicit design-exceptions (documented in guideline sections 10A.1/10B).
3. New token proposals are documented with mapping + status before broad runtime consumption.
4. State fidelity remains explicit for `hover` vs `pressed` vs `active` vs `inactive`.

## 5. Manual Regression Checklist (Shell + Power)

1. Pane states:
- Active/inactive pane header and frame dim together.
- Pane controls (`min/max/close`) have distinct hover and pressed states.
2. Taskbar:
- Tabs show distinct `normal`, `hover`, `pressed`, `active`, `unread`.
- Restore/minimize flow is visually stable.
3. Menus:
- Start/context/systray menus share consistent item metrics and separators.
- Context menu layers above taskbar and panes.
4. Power flow:
- Login -> welcome -> desktop transition is smooth.
- Logoff and shutdown screens match the same visual language.
- No unexpected lines/artifacts in welcome footer.
5. Theme parity:
- Validate at least `blauw`, `klassiek`, `zune`.
- Disabled/readability states stay clear.

## 6. Follow-up Scope (Out Of This Pass)

Next UI-guideline rollout scope after Shell + Power:
1. Contacts UI parity pass
2. Conversation UI parity pass
3. Apps UI parity pass (notepad/calculator/paint/browser/media/teamtalk/games)

## 7. Contacts State Matrix (Wave A Baseline)

| Surface | normal | hover | pressed | active | selected | blocked | disabled | busy | error | focus |
|---|---|---|---|---|---|---|---|---|---|---|
| `contacts-item` row | required | required | optional | optional | required | required | n/a | n/a | n/a | n/a |
| `contacts-status-popup-item` | required | required | optional | required | optional | n/a | required | n/a | n/a | n/a |
| `contacts-task-item` | required | required | optional | optional | n/a | n/a | required | n/a | n/a | n/a |
| `contacts-signin-input` | required | n/a | n/a | n/a | n/a | n/a | optional | n/a | required | required |
| `contacts-signin-btn` | required | required | required | optional | n/a | n/a | required | required | n/a | optional |
| `contacts-signin-status` panel | required | n/a | n/a | optional | n/a | n/a | n/a | required | optional | n/a |

Legend uitbreiding:
- `busy`: expliciete "bezig met aanmelden"-state.
- `error`: expliciete foutstate met voldoende contrast.
- `focus`: keyboard-focusstate op invoer/acties.

## 8. Contacts Baseline Checkpoints (Theme Parity)

1. Contact list row states:
- Hover en selected zijn visueel verschillend.
- Blocked rows blijven herkenbaar zonder leesbaarheidsverlies.
- Presence-dot + statuslabel behouden contrast.

2. Status selector/popup:
- Current status is direct leesbaar.
- Popup item hover/active/disabled zijn duidelijk onderscheidbaar.
- Checkmark/dot alignment blijft stabiel in alle thema's.

3. Sign-in panel:
- Inputs tonen duidelijke focusstate.
- Busy/signing-in state blijft visueel coherent.
- Error state is duidelijk zonder layout-shift.

4. Theme parity must-check:
- `blauw`
- `klassiek`
- `zune`

5. Functional parity lock:
- Geen wijziging in sign-in logic of contactacties.
- Alleen visuele/state-fidelity aanpassingen in deze wave.

## 9. Contacts Must-Pass Regression Checklist (Wave A Lock)

1. Sign-in panel:
- `contacts-signin-input` focusstate zichtbaar en consistent.
- `contacts-signin-btn` hover/pressed/focus duidelijk onderscheidbaar.
- `contacts-signin-cancel` pressed/focus consistent.

2. Contacts list:
- `contacts-item` hover en pressed verschillen zichtbaar.
- `contacts-item--blocked` blijft herkenbaar en niet interactief.
- Presence dot + status label blijven leesbaar in `blauw`, `klassiek`, `zune`.

3. Status selector:
- `contacts-status-arrow` active feedback zichtbaar.
- `contacts-status-popup-item` normal/hover/active/disabled onderscheidbaar.
- Geen alignment regressie op checkmark/dot.

4. Task panel:
- `contacts-task-header` hover/pressed onderscheidbaar.
- `contacts-task-item` hover/pressed zichtbaar.
- `contacts-task-item-disabled` blijft visueel disabled zonder active feedback.

5. Functional lock:
- Geen wijzigingen in sign-in flow, presence policy of contactacties.
- Alleen CSS/state-fidelity in deze wave.

## 10. Wave A Closure And Backlog Handoff

Wave A (Contacts UI parity) is functionally scoped for closure under these constraints:
1. Token compliance pass uitgevoerd in `src/styles/04-contacts.css`.
2. State fidelity pass uitgevoerd zonder logic-wijzigingen.
3. Contacts regression checklist hierboven dient als lock voor volgende waves.

Handoff naar volgende waves:
1. Wave B (Conversation): matrix + token/readability + toolbar/input/invite/wink state fidelity.
2. Wave C (Apps): app-by-app parity (notepad/calculator/paint/browser/media/teamtalk/games).

## 11. Conversation State Matrix (Wave B Baseline)

| Surface | normal | hover | pressed | active | selected | disabled | focused | pending | minimized | unfocused |
|---|---|---|---|---|---|---|---|---|---|---|
| `chat-toolbar-btn` | required | required | required | optional | n/a | required | optional | optional | n/a | n/a |
| `chat-input-text` | required | n/a | n/a | optional | n/a | optional | required | n/a | n/a | n/a |
| `chat-send-btn` | required | required | required | optional | n/a | required | optional | n/a | n/a | n/a |
| `chat-message` self/contact/system/legacy | required | n/a | n/a | optional | n/a | n/a | n/a | n/a | n/a | n/a |
| `typing-indicator` | hidden | n/a | n/a | visible | n/a | n/a | n/a | n/a | n/a | n/a |
| `game-invite-bar` / `wink` surface | required | optional | optional | optional | n/a | required | n/a | required | n/a | n/a |
| `conversation-pane` shell state | required | n/a | n/a | active | n/a | n/a | n/a | n/a | required | required |

Legend uitbreiding:
- `pending`: wachtende invite/wink state.
- `minimized`: pane geminimaliseerd in taskbar.
- `unfocused`: pane open maar niet actief.

## 12. Conversation Baseline Checkpoints (Theme Parity)

1. Message readability:
- `self`, `contact`, `system`, `legacy` blijven direct onderscheidbaar.
- Divider/history labels blijven leesbaar en stabiel.

2. Toolbar and input controls:
- `chat-toolbar-btn` hover/pressed/disabled duidelijk gescheiden.
- `chat-send-btn` pressed zichtbaar anders dan hover.
- Input focusstate helder, zonder layout-shift.

3. Typing + invite/wink surfaces:
- `typing-indicator` zichtbaar/verborgen state is eenduidig.
- Invite/wink pending en disabled states zijn visueel coherent.

4. Pane state scenarios:
- Active pane vs unfocused pane visueel consistent.
- Minimized -> restore veroorzaakt geen style desync.

5. Theme parity must-check:
- `blauw`
- `klassiek`
- `zune`

6. Functional parity lock:
- Geen wijziging in message/invite/wink/presence/session logic.
- Alleen visual/state-fidelity in deze wave.

## 13. Conversation Must-Pass Regression Checklist (Wave B Lock)

1. Message surface:
- `self`, `contact`, `system`, `legacy` blijven direct onderscheidbaar.
- Legacy headers/content blijven leesbaar met lagere nadruk.
- History divider/load-more behoudt contrast in `blauw`, `klassiek`, `zune`.

2. Toolbar + input:
- `chat-toolbar-btn` heeft zichtbaar verschil tussen hover en pressed.
- Disabled toolbar buttons reageren niet op pointer input.
- `chat-input-tool` hover/pressed/focus zichtbaar en consistent.
- `chat-send-btn` hover/pressed/focus zichtbaar en consistent.

3. Typing + invite/wink:
- `typing-indicator` visible/hidden state blijft helder.
- `game-invite-bar` knoppen tonen hover/pressed/focus.
- `game-select-menu-item` en `wink-select-menu-item` hebben active state.

4. Call controls:
- `call-btn` hover/pressed/focus consistent.
- accept/reject/hangup/mute blijven visueel onderscheidbaar.

5. Pane scenarios:
- Active vs unfocused pane blijft coherent.
- Minimized -> restore veroorzaakt geen style desync.

6. Functional lock:
- Geen wijziging in message/invite/wink/call/session logic.
- Alleen CSS/state-fidelity in deze wave.

## 14. Wave B Closure And Backlog Handoff

Wave B (Conversation UI parity) is functionally scoped for closure under these constraints:
1. Baseline + matrix vastgezet in secties 11/12.
2. Token/readability pass uitgevoerd in `src/styles/05-conversation.css` (+ chat-overlap in `src/styles/06-toasts-modals.css`).
3. State fidelity pass uitgevoerd zonder JS/logic-wijzigingen.
4. Conversation regression checklist hierboven dient als lock voor Wave C.

Handoff naar volgende wave:
1. Wave C (Apps): app-by-app parity (notepad/calculator/paint/browser/media/teamtalk/games).

## 15. Apps Inventory (Wave C Baseline)

Apps in scope voor parity-pass:
1. Notepad (`notepad-*`)
2. Calculator (`calculator-*`, `calc-btn*`)
3. Paint (`paint-*`)
4. Browser / Internet Adventurer (`browser-*`, `yoctol-*`)
5. Media player (`media-*`)
6. TeamTalk (`tt-*`)
7. Pinball (`pinball-*`)
8. Control Panel (`cp-*`)
9. Games UI in app shell context (`game-*`, `tictactoe-*`)

Scope-notes:
1. Deze inventory is visueel/state-fidelity; geen feature-uitbreiding.
2. Conversation-specifieke game invite/wink UI valt onder Wave B en is al gelocked.
3. Apps testen op minstens `blauw`, `klassiek`, `zune`.

## 16. Apps State Matrix (Wave C Baseline)

| App Surface | normal | hover | pressed | active/selected | disabled | focus |
|---|---|---|---|---|---|---|
| `notepad-menu-item` | required | required | optional | n/a | optional | n/a |
| `notepad-textarea` | required | n/a | n/a | n/a | required | required |
| `calc-btn` | required | required | required | optional | optional | optional |
| `paint-tool-btn` / `paint-action-btn` | required | required | required | required | optional | optional |
| `paint-grid-tool` / `paint-width-option` | required | required | optional | required | optional | optional |
| `paint-color-swatch` | required | required | optional | required | n/a | n/a |
| `browser-nav-btn` / `browser-go-btn` / `browser-bookmark-btn` | required | required | required | optional | optional | optional |
| `browser-address-input` / `yoctol-search-input` | required | n/a | n/a | n/a | optional | required |
| `media-control-btn` / `media-viz-btn` / `media-playlist-item` | required | required | required | required | required | optional |
| `media-url-input` / sliders | required | n/a | n/a | n/a | optional | required |
| `tt-tab` / `tt-btn` / `tt-mute-btn` / `tt-leave-btn` | required | required | required | required | optional | optional |
| `tt-input` / `tt-select` / `tt-audio-slider` | required | n/a | n/a | n/a | optional | required |
| `pinball-focus-overlay` / control hints | required | optional | optional | optional | n/a | optional |
| `cp-category` / `cp-action-button` | required | required | required | optional | optional | optional |
| `cp-select` / `cp-text-input` / `cp-avatar-option` | required | optional | optional | required | optional | required |
| `tictactoe-cell` / game controls | required | required | optional | required | required | optional |

Legend:
- `required`: state moet visueel duidelijk onderscheidbaar zijn.
- `optional`: alleen waar componentgedrag deze state ondersteunt.
- `n/a`: niet van toepassing op deze surface.

## 17. Apps Baseline Checkpoints (Theme Parity)

1. Menubars en toolbar controls:
- Hover/pressed states consistent met Shell/Conversation taal.
- Disabled controls blijven duidelijk disabled.

2. Text inputs en focus:
- Input focus zichtbaar zonder layout-shift (`browser`, `media`, `tt`, `cp`, `notepad` waar relevant).

3. Selected/active states:
- Paint selected tools/width/color behouden duidelijke selectie.
- Media active viz/playlist states blijven helder.
- TeamTalk active tab + muted/leaving states blijven coherent.

4. Canvas/game surfaces:
- Paint canvas, pinball embed, tictactoe board blijven visueel stabiel.
- Geen style regressie bij pane resize/minimize/restore.

5. Control Panel:
- Category cards, settings rows, avatar selection behouden consistente state-feedback.

6. Functional lock:
- Geen app business-logic wijziging in deze wave.
- Alleen visual/state-fidelity pass.

## 18. Apps Must-Pass Regression Checklist (Wave C Lock)

1. Notepad:
- `notepad-menu-item` hover/pressed blijft zichtbaar.
- `notepad-textarea` focus/disabled states blijven duidelijk.

2. Calculator:
- `calc-btn` hover/pressed onderscheid blijft duidelijk.
- Functionele knoppen blijven leesbaar in `blauw`, `klassiek`, `zune`.

3. Paint:
- `paint-tool-btn` en `paint-action-btn` tonen duidelijke hover/pressed/selected.
- `paint-grid-tool`, `paint-width-option`, `paint-color-swatch` selected state blijft stabiel.

4. Browser / Internet Adventurer:
- Nav/go/bookmark controls hebben consistente hover/pressed/focus.
- Address/search inputs behouden focus zonder layout-shift.

5. Media:
- `media-control-btn`/`media-viz-btn` hover/pressed/disabled coherent.
- Playlist active/selected state blijft leesbaar.

6. TeamTalk / Control Panel / Games:
- `tt-tab`, `tt-btn`, `tt-mute-btn`, `tt-leave-btn` states duidelijk.
- `cp-category`, `cp-action-button`, `cp-avatar-option` statefeedback coherent.
- `tictactoe-cell` statefeedback blijft zichtbaar zonder themabreuk.

7. Pane behavior lock:
- Geen z-index regressie met contextmenu/taskbar.
- Minimize/restore veroorzaakt geen visual desync.

8. Functional lock:
- Geen app business-logic wijziging.
- Alleen CSS/state-fidelity in deze wave.

## 19. Wave C Closure And Handover

Wave C (Apps UI parity) is gesloten onder deze constraints:
1. Inventory + state matrix + baseline checkpoints vastgezet in secties 15/16/17.
2. Token compliance pass uitgevoerd in `src/styles/07-apps.css` met expliciete design-exceptions waar XP-authenticiteit vaste kleuren vereist.
3. State fidelity pass uitgevoerd zonder app-logic wijzigingen.
4. Regression checklist in sectie 18 dient als lock voor toekomstige app-polish.

Volledige rolloutstatus:
1. Shell + Power: gesloten.
2. Contacts: gesloten.
3. Conversation: gesloten.
4. Apps: gesloten.

Vervolgbacklog na basis-parity:
1. Nieuwe app-features en interactie-uitbreidingen.
2. Optionele token-cleanup/migraties buiten deze parity-scope.
