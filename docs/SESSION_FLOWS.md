# Session Flow Regression Checklist

Purpose: quick validation for login/session guard changes.
Run these checks after any changes touching `App.js`, auth, presence, or `useActiveTabSessionGuard`.

## Scope
- Multi-tab same-account behavior
- Cross-window handover behavior
- Same-window relogin behavior
- Auto-login recall behavior
- Alert and cleanup behavior during conflict events

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
- No repeating conflict cleanup loop in logs.

### 3) Same Account Handover Back (A -> B -> A)
1. Complete scenario 2.
2. Login same account X again in Context A.

Expected:
- Context B is kicked once.
- Context A remains logged in.
- No repeated alerts on login screen.

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

### 6) Conflict Burst Safety
1. Trigger a real session conflict (scenario 2 or 3).
2. Observe logs for 15-20 seconds.

Expected:
- Single cleanup cycle for one conflict event.
- No repeated `Detected other session` loop after logout state is reached.

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

## Quick Log Signals

Good:
- One `Detected other session` per real handover.
- One cleanup sequence following that event.
- At most one conflict alert per conflict event.
- `Skipping stale delayed cleanup` only when session changes before delayed cleanup.
- Presence detach logs only when contacts become ineligible.

Bad:
- Repeating `Detected other session` every heartbeat interval.
- Session-kick popup repeating while on login screen.
- Older tab teardown nulls ACTIVE_TAB while newer tab is active.
- Online toast appears for removed/non-accepted contacts.
- Delayed cleanup from old session affects current logged-in state.

## Notes Template
- Date:
- Branch/commit:
- Relay endpoint:
- Browser(s):
- Passed scenarios: [ ]
- Failed scenarios: [ ]
- Observed logs:
- Follow-up actions:
