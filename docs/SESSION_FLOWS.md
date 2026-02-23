# Session Flow Regression Checklist

Purpose: quick validation for login/session guard changes.
Run these checks after any changes touching `App.js`, auth, presence, or `useActiveTabSessionGuard`.

## Scope
- Multi-tab same-account behavior
- Cross-window handover behavior
- Same-window relogin behavior
- Auto-login recall behavior
- Conflict banner and cleanup behavior during conflict events

## Preconditions
- Gun relay running and reachable.
- Two browser contexts available:
  - Context A (normal window)
  - Context B (incognito/private or different browser)
- At least two accounts available for cross-account check.

## Scenarios

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

Manual (keep in checklist):
- Scenario 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
- Browser-context behavior (A/B takeover), real relay timing, and teardown race observation.

## Notes Template
- Date:
- Branch/commit:
- Relay endpoint:
- Browser(s):
- Passed scenarios: [ ]
- Failed scenarios: [ ]
- Observed logs:
- Follow-up actions:
