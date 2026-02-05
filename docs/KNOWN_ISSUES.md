# Chatlon — Known Bugs & Issues

This file is AI-critical memory.
Do not delete entries unless confirmed fixed.
NEW_SECTION:
## 🤖 Claude Priority Queue

Issues are organized by priority for Claude development sessions:

### HIGH Priority (Immediate Claude attention)
*Issues that break core functionality*

### MEDIUM Priority (Next Claude session)  
*Issues that impair features but don't block usage*

### LOW Priority (When requested or convenient)
*Minor improvements and cleanup tasks*

---
---

## Status Reference

| Status | Meaning |
|--------|---------|
| `open` | Bug confirmed, not yet worked on |
| `investigating` | Actively looking into cause |
| `blocked` | Cannot fix without other changes |
| `workaround` | Temporary fix in place |
| `fixed-awaiting-release` | Fixed in code, not yet deployed |
| `fixed` | Confirmed fixed and deployed |
| `wont-fix` | Intentional or not worth fixing |

## Severity Reference

| Severity | Meaning |
|----------|---------|
| `critical` | App unusable, data loss |
| `high` | Major feature broken |
| `medium` | Feature impaired but usable |
| `low` | Minor annoyance |

---

## BUG-001 — Duplicate toast notifications

**STATUS:** fixed

**SEVERITY:** medium

**AREA:** notifications

**SYMPTOM:**
Toast notifications for the same message would appear multiple times, especially after page refresh or reconnect.

**REPRO STEPS:**
1. Open Chatlon
2. Receive message from contact
3. Sometimes toast appears 2-3 times for same message

**SUSPECTED CAUSE:**
Gun.on() replays data on reconnect. State-based duplicate check was async and allowed race conditions.

**FILES:**
- src/App.js (showToast, shownToastsRef)

**FIX APPLIED:**
Changed from useState Set to useRef Set for synchronous duplicate checking. Toast key now includes messageId for messages and requestId for friend requests.

**AI WARNING:**
Always use refs (not state) for synchronous checks in Gun callbacks. State updates are async and cause race conditions.

---

## BUG-002 — Stale closure in Gun message listeners

**STATUS:** fixed

**SEVERITY:** high

**AREA:** gun-sync

**SYMPTOM:**
Message listeners in App.js would use stale values for `conversations` and `activePane`, causing toasts to show even when conversation window was open.

**REPRO STEPS:**
1. Open conversation with contact
2. Keep window open and focused
3. Receive message
4. Toast incorrectly appears despite window being open

**SUSPECTED CAUSE:**
Gun.on() callbacks capture closure at creation time. React state updates don't update the captured values.

**FILES:**
- src/App.js (conversationsRef, activePaneRef)

**FIX APPLIED:**
Added refs that sync with state via useEffect. Gun callbacks read from refs instead of state.

**AI WARNING:**
Never read React state directly inside Gun.on() callbacks. Always use refs and sync them with useEffect.

---

## BUG-003 — Old messages trigger new message toasts

**STATUS:** fixed

**SEVERITY:** high

**AREA:** gun-sync

**SYMPTOM:**
When opening Chatlon, old messages from Gun replay would trigger toast notifications as if they were new.

**REPRO STEPS:**
1. Have existing chat history
2. Close and reopen Chatlon
3. Old messages trigger toasts

**SUSPECTED CAUSE:**
Gun replays all data on subscription. No filtering between old and new messages.

**FILES:**
- src/App.js (listenerStartTimeRef)
- src/ConversationPane.js (sessionStartTime, lastSeenMessageTime)

**FIX APPLIED:**
Added listenerStartTimeRef set at listener creation time. Messages with timeRef before this are ignored for toasts.

**AI WARNING:**
Any new Gun listener that triggers UI actions must filter by timestamp. Store listener start time and compare against message timeRef.

---

## BUG-004 — Friend request listener fires for old requests

**STATUS:** fixed

**SEVERITY:** medium

**AREA:** gun-sync

**SYMPTOM:**
Old pending friend requests would trigger toast notifications on every app load.

**REPRO STEPS:**
1. Have pending friend request
2. Refresh page
3. Toast appears again for same old request

**SUSPECTED CAUSE:**
Same as BUG-003 - Gun replays data, no timestamp filtering.

**FILES:**
- src/App.js (setupFriendRequestListener)

**FIX APPLIED:**
Added listenerStartTime check. Requests with timestamp before listener start are ignored.

**AI WARNING:**
Same as BUG-003. All Gun listeners need timestamp-based filtering for notifications.

---

## BUG-005 — Window position resets on state change

**STATUS:** open

**SEVERITY:** low

**AREA:** window-manager

**SYMPTOM:**
Occasionally window jumps back to previous position after dragging, especially when other state changes occur.

**REPRO STEPS:**
1. Open window
2. Drag to new position
3. Receive message or other state update
4. Window may jump

**SUSPECTED CAUSE:**
Position stored in state, re-render may reset to initialPosition if hasInitialized ref not working correctly.

**FILES:**
- src/Pane.js (position state, hasInitialized ref)

**WORKAROUND:**
Drag window again after it jumps.

**AI WARNING:**
Do not remove hasInitialized ref logic. It prevents position reset on re-render. Fix should ensure ref persists correctly across renders.

---

## BUG-006 — Presence status not synced across users

**STATUS:** fixed

**SEVERITY:** medium

**AREA:** presence

**SYMPTOM:**
Contact list shows all contacts as "Online" regardless of actual status. Status selector only affects local display.

**REPRO STEPS:**
1. User A sets status to "Away"
2. User B still sees User A as "Online"

**SUSPECTED CAUSE:**
Status is only stored locally, not synced to Gun. No presence heartbeat system implemented.

**FILES:**
- src/ContactsPane.js (myStatus state - local only)
- src/App.js (presence system)

**FIX APPLIED:**
Implemented full presence heartbeat system:
- App.js sends heartbeat every 20 seconds to `gun.get('presence').get(username)`
- ContactsPane.js listens to presence for each contact
- Contacts shown as offline if no heartbeat within 60 seconds
- `beforeunload` handler sets offline status when closing browser
- Auto-away after 5 minutes of inactivity
- Status selector now syncs with Gun via props from App.js

**AI WARNING:**
Presence data is in PUBLIC Gun space (`gun.get('presence')`) not user space. This is intentional - other users need to read it.

---

## BUG-007 — Calculator memory functions not implemented

**STATUS:** open

**SEVERITY:** low

**AREA:** calculator

**SYMPTOM:**
MC, MR, MS, M+ buttons in calculator do nothing.

**REPRO STEPS:**
1. Open calculator
2. Click any memory button
3. Nothing happens

**SUSPECTED CAUSE:**
Buttons exist but no state/handlers implemented.

**FILES:**
- src/CalculatorPane.js

**WORKAROUND:**
Don't use memory functions.

**AI WARNING:**
Low priority. Fix only if specifically requested.

---

## BUG-008 — Paint undo limited / inconsistent

**STATUS:** open

**SEVERITY:** low

**AREA:** paint

**SYMPTOM:**
Undo in Paint sometimes doesn't work correctly, especially for shape tools during drag preview.

**REPRO STEPS:**
1. Draw rectangle
2. During drag, canvas shows preview
3. Release
4. Undo may restore to wrong state

**SUSPECTED CAUSE:**
History saved at inconsistent points. Shape preview redraws from history during drag.

**FILES:**
- src/PaintPane.js (canvasHistory, historyStep)

**WORKAROUND:**
Use undo immediately after completing action.

**AI WARNING:**
Canvas history system is fragile. Any changes need careful testing of all tools.

---

## BUG-009 — Media player visualisation stops on tab switch

**STATUS:** open

**SEVERITY:** low

**AREA:** media-player

**SYMPTOM:**
When switching to another browser tab, the visualisation freezes. Audio continues playing.

**REPRO STEPS:**
1. Open Media Player
2. Play track with visualisation
3. Switch to another browser tab
4. Switch back - visualisation frozen or choppy

**SUSPECTED CAUSE:**
requestAnimationFrame pauses when tab is not visible. AudioContext continues.

**FILES:**
- src/MediaPane.js (visualize function, animationRef)

**WORKAROUND:**
Click pause then play to restart visualisation.

**AI WARNING:**
This is browser behavior, not easily fixable. Could detect visibility change and restart animation, but low priority.

---

## BUG-010 — Emoticon picker closes on scroll

**STATUS:** open

**SEVERITY:** low

**AREA:** chat-ui

**SYMPTOM:**
If message area scrolls while emoticon picker is open, picker may close unexpectedly.

**REPRO STEPS:**
1. Open emoticon picker
2. Receive new message (causes scroll)
3. Picker closes

**SUSPECTED CAUSE:**
Click outside handler may trigger on scroll-related events.

**FILES:**
- src/ConversationPane.js (handleClickOutside, emoticonPickerRef)

**WORKAROUND:**
Reopen picker after scroll.

**AI WARNING:**
Fix should check if click target is actually outside, not just any mousedown event.

---

## BUG-011 — Branding Inconsistencies

**STATUS:** fixed (2025-02-03)
**SEVERITY:** low
**FIX APPLIED:** - Alle `.msn-*` CSS classes hernoemd naar `.chat-*`
- Alle `.boot-xp-*` CSS classes hernoemd naar `.boot-dx-*`
- `.win-btn` hernoemd naar `.pane-btn`
- UI teksten gesynchroniseerd naar Macrohard/Panes/Chatlon
- *Uitzondering:* "start" tekst op taakbalk blijft behouden
- *Uitzondering:* BrowserPane satire (MSN/Microsoft refs) blijft behouden als feature

---

## [FIXED] FEAT-001 — True Presence Detection
**Status:** Fixed (2025-02-04)
**Resolution:** Heartbeat system implemented using Gun.js. Fixed stale closure bug in App.js using `userStatusRef` to ensure the heartbeat always sends the correct status. Added priority logic in ContactsPane to respect 'offline' status over timestamps.

---

BUG-012 — ConversationPane session initialization logging inconsistency
STATUS: open
SEVERITY: low
AREA: debugging, session-management
SYMPTOM:
Debug logs show currentSessionId: false, sessionStartTime: false when ConversationPane opens, but real-time messaging still functions correctly.
REPRO STEPS:

User opens chat with contact
ConversationPane logs show session not initializing
Real-time messaging still works despite logs

SUSPECTED CAUSE:
Race condition or timing issue in session initialization logging. The actual functionality works, but debug logs suggest otherwise.
FILES:

src/components/ConversationPane.js (session management useEffect)

WORKAROUND:
None needed - functionality works correctly despite debug logs.
AI WARNING:
This is a logging/debugging inconsistency, not a functional bug. Real-time messaging works correctly regardless of these debug messages.

---
## 📝 Issue Templates

### For Claude Sessions:
```markdown
## BUG-XXX — [Component]: Brief description

**STATUS:** open
**SEVERITY:** [critical | high | medium | low]  
**CLAUDE PRIORITY:** [HIGH | MEDIUM | LOW]
**AREA:** [window-manager | gun-sync | presence | chat-ui | notifications | component-name]

**SYMPTOM:**
What the user experiences.

**REPRO STEPS:**
1. Clear steps to reproduce
2. Expected vs actual behavior

**FILES AFFECTED:**
- src/ComponentName.js - Line XX (suspected location)
- src/App.css - Section XX (if styling related)

**CLAUDE INSTRUCTIONS:**
- Search these specific lines first
- Check for [specific pattern/issue]
- DO NOT change [specific constraint]

**TECHNICAL NOTES:**
Implementation details that might help debugging.
```

### For Feature Requests:
```markdown
## FEAT-XXX — [Component]: Feature name

**STATUS:** open
**CLAUDE PRIORITY:** [HIGH | MEDIUM | LOW]
**AREA:** [component-name]

**DESCRIPTION:**
Clear explanation of desired feature.

**ACCEPTANCE CRITERIA:**
- [ ] Criterion 1
- [ ] Criterion 2

**FILES TO MODIFY:**
- src/ComponentName.js - Add feature logic
- src/App.css - Add styling  
- src/paneConfig.js - Register if new pane

**CLAUDE NOTES:**
- Follow existing pattern in [similar component]
- Use [specific approach] for consistency
- Test with [specific scenario]
```