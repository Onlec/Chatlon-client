# Session Flow Regression Checklist

Purpose: quick validation for login/session guard changes.
Run these checks after any changes touching `App.js`, auth, presence, or `useActiveTabSessionGuard`.

## Scope
- Multi-tab same-account behavior
- Cross-window handover behavior
- Same-window relogin behavior
- Auto-login recall behavior
- Conflict banner and cleanup behavior during conflict events
- Messaging shell baseline during App-shell modularization:
  - message/nudge/presence toast routing must remain unchanged
  - taskbar unread/flicker must remain unchanged
  - startmenu and systray toggle behavior must remain unchanged

## Preconditions
- Gun relay running and reachable.
- Two browser contexts available:
  - Context A (normal window)
  - Context B (incognito/private or different browser)
- At least two accounts available for cross-account check.

## Scenarios

### M0) Messenger Hard Gate (Desktop auth != Messenger active)
1. Login op desktop met account B.
2. Laat messenger afgemeld.
3. Laat account A een bericht, nudge en friend request naar B sturen.
4. Meld messenger op B opnieuw aan.
5. Laat A opnieuw een nieuw bericht sturen.

Expected:
- Tijdens afmelding: geen chat ingestie, geen friend-request ingestie, geen toasts, geen unread/flicker.
- Na heraanmelden: listeners starten opnieuw.
- Geen retroactieve toasts voor events uit afgemelde periode.
- Alleen nieuwe events na heraanmelding triggeren toast/unread gedrag.

### 1) Same Window Relogin
1. Login in Context A.
2. Log off from Start menu.
3. Login again in Context A.

Expected:
- No repeated "session is being closed" popup loop.
- Login succeeds and remains stable.
- Presence/listeners continue working.

### 2) Same Account Handover (A -> B)
1. Login account X in Context A.
2. Login same account X in Context B.

Expected:
- Context A is kicked once.
- Context B remains logged in.
- Context A lands on login with a non-blocking conflict banner.
- No repeating conflict cleanup loop in logs.

### 3) Same Account Handover Back (A -> B -> A)
1. Complete scenario 2.
2. Login same account X again in Context A.

Expected:
- Context B is kicked once.
- Context A remains logged in.
- No repeated conflict banner loop on login screen.

### 4) Different Accounts in Separate Contexts
1. Login account X in Context A.
2. Login account Y in Context B.

Expected:
- Both remain logged in.
- No cross-account session kicks.

### 5) Auto-login Recall Path
1. Enable remember/recall flow for account X.
2. Refresh Context A to trigger auto-login initialization.

Expected:
- Session initializes without stale session-kick alert.
- No unexpected immediate logout.
- Any old conflict banner is absent after successful login.

### 6) Conflict Burst Safety
1. Trigger a real session conflict (scenario 2 or 3).
2. Observe logs for 15-20 seconds.

Expected:
- Single cleanup cycle for one conflict event.
- No repeated `Detected other session` loop after logout state is reached.
- At most one sticky conflict banner is shown per conflict event.

### 7) Rapid Dual-Login Race
1. Open Context A and Context B for the same account.
2. Trigger login in both contexts as quickly as possible.

Expected:
- "Already logged in" confirm appears consistently in second login attempt.
- Newest session remains logged in.
- Older session is kicked once.
- No delayed handover after several heartbeat cycles.

### 8) Delayed Cleanup Stale Guard
1. Login as account X.
2. Within 5 seconds, log off and login again (same or different account).
3. Watch logs beyond the original cleanup delay window.

Expected:
- Old delayed cleanup does not run against the new active session.
- Optional guard log may appear once: `Skipping stale delayed cleanup`.
- No unexpected session reset after the second login stabilizes.

### 9) Presence Prune Regression
1. Ensure A and B are accepted contacts.
2. Remove/downgrade one side so contact becomes ineligible.
3. Toggle the other account online/offline.

Expected:
- Presence listener detaches for ineligible contact.
- No stale online toast popup for removed/non-accepted contact.
- Optional monitor log may appear: `Listener verwijderd voor contact`.

### 10) Owner-Safe ACTIVE_TAB Teardown
1. Login account X in Context A.
2. Login same account X in Context B so A is kicked.
3. Observe ACTIVE_TAB behavior while A exits.

Expected:
- Context B remains owner.
- Context A teardown does not clear B's ACTIVE_TAB record.
- No ownership flip-flop or ghost kick after handover.

### 11) Conversation Reopen Toast Continuity
1. Login account B in Context A.
2. From account A (other context), send one message to B while B's conversation is closed.
3. Verify B gets toast + taskbar unread.
4. Open B's conversation with A, then close it.
5. Send another message from A to B.

Expected:
- B still gets toast + taskbar unread after reopen/close cycles.
- This remains true when B minimizes the conversation or leaves it open but unfocused.
- No "works only once after login" behavior.

### 12) Cross-Account Isolation Stress (A/B across X/Y)
1. Login account A in Context X.
2. Login account A in Context Y (X should be kicked once).
3. Login account B in Context X.
4. Login account B in Context Y.
5. Login account A again in Context X.

Expected:
- Step 2: only A@X is kicked; A@Y remains active.
- Step 3: B@X logs in and stays active (no repeated kick loop).
- Step 4: only B@X is kicked; B@Y remains active.
- Step 5: only A's own other session may be replaced (newest A wins).
- A and B never kick each other across accounts.
- No repeated `Detected other session` loop for B after step 3.

### 13) Games Invite Flow (Request-Scoped)
1. Open conversation A<->B.
2. A sends Tic Tac Toe invite.
3. B accepts.
4. A or B closes game pane.

Expected:
- Invite records are request-scoped (no overwrite race on a single pair node).
- Accept targets the same requestId.
- Closing game pane can end the game state, but should not auto-reopen abandoned game on conversation reopen.

### 14) Games Button Lock Rules
1. Start a game between A and B.
2. Verify "Spelletjes" button while game pane is open.
3. Close game pane.
4. Send/cancel/decline invite flow and re-check button.

Expected:
- Button disabled while local game pane is open.
- Button disabled while incoming/outgoing pending invite exists.
- Button re-enabled after close/cancel/decline resolves.

### 15) Messenger Sign-Out Closes Games
1. Open active game pane.
2. Sign out messenger or close messenger pane.

Expected:
- All conversation panes close.
- All game panes close.
- No playable game pane remains after messenger sign-out/close.

## Quick Log Signals

Good:
- One `Detected other session` per real handover.
- One cleanup sequence following that event.
- At most one conflict banner per conflict event.
- `Skipping stale delayed cleanup` only when session changes before delayed cleanup.
- Presence detach logs only when contacts become ineligible.

Bad:
- Repeating `Detected other session` every heartbeat interval.
- Conflict banner reappearing without a new conflict event.
- Older tab teardown nulls ACTIVE_TAB while newer tab is active.
- Online toast appears for removed/non-accepted contacts.
- Delayed cleanup from old session affects current logged-in state.
- Message toast flow stops after opening/closing a conversation once.
- Account A login causes account B session to be kicked (or vice versa).

## Automation Coverage Map (Core)

Automated (unit/component):
- Session ownership decisions (`src/utils/sessionOwnership.test.js`)
  - stale heartbeat ignore
  - same clientId ignore
  - newer/older owner resolution
  - lexical tie-break
  - legacy fallback via tabId timestamp
- Session notice lifecycle (`src/utils/sessionNotice.test.js`)
  - save/load roundtrip
  - TTL expiry cleanup
  - explicit clear behavior
- Login conflict banner UX (`src/components/screens/LoginScreen.test.js`)
  - banner renders with conflict notice
  - dismiss callback fired
  - login UI remains interactive while banner is visible
- Message listener continuity (`src/hooks/useMessageListeners.test.js`)
  - transient empty `ACTIVE_SESSIONS` event does not break incoming message/toast path
- Messenger coordinator policy (`src/hooks/useMessengerCoordinator.test.js`)
  - incoming closed chat -> unread + message toast, no auto-open
  - nudge follows nudge toast path (no duplicate message toast)
  - presence toast respects notification setting
  - toast click routing opens conversation or contacts pane
  - stable handler identity with latest runtime refs (no stale closure regressions)

Manual (keep in checklist):
- Scenario 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
- Browser-context behavior (A/B takeover), real relay timing, and teardown race observation.
- During shell modularization, rerun Conversation scenarios C1-C6 after each approved scope-step.

## Conversation Regression Appendix (MSN Parity)

Use this checklist after any change in:
- `src/components/panes/ConversationPane.js`
- `src/hooks/useMessageListeners.js`
- `src/components/panes/conversation/*`

### Conversation Scenarios

### C1) Closed chat incoming message
1. B keeps conversation with A closed.
2. A sends a message to B.

Expected:
- B gets toast.
- B taskbar conversation tab flickers/unread.
- Conversation does not auto-open.

### C2) Minimized or unfocused incoming message
1. B opens conversation with A and then minimizes it (or focuses another pane).
2. A sends a message to B.

Expected:
- B gets toast + taskbar unread/flicker.
- No forced auto-open.

### C3) Typing indicator parity
1. A starts typing in open conversation with B.
2. A stops typing.

Expected:
- B sees typing indicator quickly.
- Indicator clears on stop/timeout.
- No permanently stuck typing state after close/reopen.

### C4) Nudge parity
1. A sends nudge to B while chat closed.
2. Repeat with chat open/unfocused.

Expected:
- Nudge side effects fire once per unique nudge timestamp.
- Taskbar/toast behavior remains consistent with current UX rules.
- No duplicate nudge effects from one nudge event.

### C5) Legacy boundary on open
1. Build backlog in a conversation.
2. Keep chat closed; receive N unread messages.
3. Open chat from taskbar.

Expected:
- Visible window = 5 legacy + all unread non-legacy.
- Not only 5 total.
- No double-count bug (`legacy = 5 + unread` plus unread again).
- "Load older" still works for deeper history.

### C6) Conversation cleanup boundary
1. Close conversation pane.
2. Trigger incoming traffic from peer.

Expected:
- No orphan in-pane listener side effects.
- Incoming flow still handled by global message listener path (toast/unread rules).
- Reopen shows correct history and boundary behavior.

## Conversation Automation Coverage

Automated:
- `src/components/panes/conversation/conversationState.test.js`
  - normalization guards (`_`, `#`, invalid sender/id)
  - reducer dedupe/order/reset
- `src/components/panes/ConversationPane.behavior.test.js`
  - session-ready gating
  - one-time nudge side effects
  - create-once session bootstrap
  - no duplicate create in quick race/reopen
  - noise filtering in stream ingestion
  - legacy/non-legacy visible window behavior
  - burst visibility regression checks
- `src/components/panes/ConversationPane.listeners.test.js`
  - listener lifecycle stability across session changes

Manual:
- C1, C2, C3, C4, C5, C6 in real browser contexts with real relay timing.

## Conversation Module Map (Current Runtime)

Use this map when changing conversation code to avoid drift:
- `src/components/panes/ConversationPane.js`
  - orchestration shell (state wiring, pane-level callbacks, layout composition)
- `src/components/panes/conversation/sessionController.js`
  - session bootstrap/follow (`.on + .once + delayed create`, generation-safe cleanup)
- `src/components/panes/conversation/streamController.js`
  - chat/nudge/typing stream attach-detach lifecycle with generation guards
- `src/components/panes/conversation/windowPolicy.js`
  - pure visible-window/autoscroll/load-older policy
- `src/components/panes/conversation/conversationState.js`
  - message normalization + reducer ordering/dedupe contract
- `src/components/panes/conversation/ChatTopMenu.js`
- `src/components/panes/conversation/ChatToolbar.js`
- `src/components/panes/conversation/ChatMessage.js`
- `src/components/panes/conversation/ChatInput.js`
- `src/components/panes/conversation/AvatarDisplay.js`
  - presentation-only UI components (no session/stream ownership)

Rule of thumb:
- Behavior changes in session/stream/window state require test updates in:
  - `src/components/panes/ConversationPane.behavior.test.js`
  - `src/components/panes/ConversationPane.listeners.test.js`
  - `src/components/panes/conversation/conversationState.test.js`

## Notes Template
- Date:
- Branch/commit:
- Relay endpoint:
- Browser(s):
- Passed scenarios: [ ]
- Failed scenarios: [ ]
- Observed logs:
- Follow-up actions:

## Shell Automation Coverage
Automated (unit):
- `src/hooks/useTaskbarManager.test.js`
  - taskbar click restores minimized pane and focuses it.
- `src/hooks/useStartMenuManager.test.js`
  - start menu toggle/close state transitions.
- `src/hooks/useSystrayManager.test.js`
  - systray menu open/close and action dispatch wrappers.
- `src/hooks/useDesktopManager.test.js`
  - desktop shortcut model and launch action wiring.

Manual (keep in checklist):
- Full shell integration across desktop + taskbar + startmenu + systray in real browser contexts.

## Presence Baseline Lock (Extraction Step 1)

These invariants are locked before extracting presence ownership out of `App.js`.

### Presence Invariants
- Contact presence listeners are eligible only when `canAttachPresenceListeners(contactData)` is true.
- Online transition toasts are emitted from the central App presence path only.
- Ineligible contacts must be detached and must not keep stale presence listeners.
- Session teardown paths (manual logoff, shutdown, conflict) must leave no active presence callbacks.

### Presence Observability Signals
Good:
- One attach log per eligible contact: `Listener op voor contact`.
- One detach log when eligibility is lost: `Listener verwijderd voor contact`.
- One transition log per real status change: `prev: offline -> new: online`.

Bad:
- Repeated attach logs for the same contact without cleanup.
- Online toasts for ineligible contacts (limbo/non-accepted/non-list).
- Presence callbacks firing after logout/conflict cleanup.

### Presence Manual Scenarios (Baseline)
1. Accepted contact goes offline -> online:
   - exactly one online toast.
2. Contact becomes ineligible (remove/downgrade):
   - listener detaches and no online toast follows.
3. Conflict/logoff/shutdown:
   - no presence logs or toasts after teardown completes.

### Presence Robustness Baseline (Flap/Race/Load)
Run these before and after each robustness step:
1. Flap:
   - same contact toggles online/offline quickly for 10-15s.
   - expected baseline: no repeated listener reattach loops; transition logs stay bounded.
2. Race:
   - two browser contexts for same account; force handover and quick relogin.
   - expected baseline: no ghost online transition after session teardown.
3. Load:
   - account with many contacts (or scripted fixture list).
   - expected baseline: startup completes without UI freeze; attach logs are finite.

### Presence Observability Counters (Step 1)
`usePresenceCoordinator` now tracks debug counters in logs:
- `attached`
- `detached`
- `transitionsEmitted`
- `transitionsSuppressed`
- `staleSkipped` (reserved for later stale-policy steps)

Log point:
- `[PresenceMonitor][metrics] cleanup snapshot`

### Presence Ownership (Final after extraction)
- `usePresence`: self heartbeat/status lifecycle only.
- `usePresenceCoordinator`: contact presence listeners + transition detection.
- `useMessengerCoordinator`: presence toast policy.
- `ContactsPane`: read-only consumer of `contactPresenceMap`.

### Presence Automation Coverage
Automated:
- `src/hooks/usePresenceCoordinator.test.js`
  - listener attach/detach on eligibility changes
  - priority immediate attach + queued attach
  - offline->online / offline->away / appear-offline->online transitions fire once
  - stale/out-of-order heartbeat replay suppression
  - cleanup/remount does not create ghost transition toasts
  - idempotent cleanup behavior
- `src/hooks/usePresence.test.js`
  - messenger sign-in boundary (`isActive=false` => no heartbeat loop, offline write only)
  - additive self-presence fields are written
  - heartbeat sequence stays monotonic
  - auto-away activity recovery is instant for local status (`away -> online`)
  - manual `away/busy` is not auto-reset by activity
- `src/utils/presencePolicy.test.js`
  - transition helper policy (`offline -> online|away|busy`)
  - heartbeat freshness and stale-transition helper behavior
- `src/components/panes/ContactsPane.test.js`
  - consumes presence via props
  - no per-contact `PRESENCE/*` subscriptions in ContactsPane

Manual:
- Self presence lifecycle through messenger sign-in/sign-out and session close paths.
- Browser-context validation of online transitions with real relay timing.
- Messenger hard-gate validation (M0).

### Presence Operational Checklist (Noisy Relay)
Run this when relay jitter or packet reordering is suspected:
1. Flap test:
   - force repeated `online <-> offline` toggles for one contact (10-15s).
   - expected: bounded transitions, no toast spam.
2. Out-of-order replay test:
   - replay older heartbeat payload after newer one (same contact).
   - expected: stale update ignored; current status unchanged.
3. Explicit offline test:
   - set contact to `appear-offline`, then to `online`.
   - expected: next `online` transition still emits exactly one toast.
4. Scale test (100+ contacts):
   - login and observe startup.
   - expected: active/open conversation contacts attach immediately; others attach in queue without UI freeze.
5. Teardown test:
   - manual logoff / shutdown / conflict.
   - expected: no post-teardown presence callbacks or toasts.
6. Auto-away recovery test:
   - force self status to auto-away, then perform first activity event.
   - expected: local status label flips to online immediately (no throttle wait).
7. Manual status guard test:
   - set self status to manual `away` or `busy`, then perform activity.
   - expected: status remains manual, no auto-reset to online.

Presence log signals:
- Good:
  - `Listener op voor contact` appears once per effective attach.
  - `Suppressed stale/out-of-order update` appears only during replay/jitter.
  - `ONLINE TRANSITIE` appears once per real offline->reachable transition.
- Bad:
  - repeated attach/detach loop for same contact without eligibility change.
  - online toast missing after `appear-offline -> online`.
  - presence callbacks after teardown completes.
