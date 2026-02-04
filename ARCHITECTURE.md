# Chatlon — Architecture

## Overview

Chatlon is a nostalgic Panes dX–style realtime chat environment inspired by classic chat messengers.  
The system is built as a modern React web application with a retro desktop UI metaphor.

**Branding Note:** This project uses parody branding throughout:
- Windows → **Panes**
- XP → **dX**
- Microsoft → **Macrohard**
- MSN Messenger → **Chatlon** (or just "chat")

Never reference the original brand names in code, UI text, or documentation.

The architecture consists of:

- **Client** — React application (UI + state + Gun client)
- **Server** — Gun.js relay/persistence node (separate repo)

Realtime data synchronization is handled through Gun.js instead of a traditional REST API.

---

## System Topology

```
┌─────────────────────────────┐
│  Client (React on Vercel)   │
│  - Window Manager           │
│  - Chat UI                  │
│  - Gun.js Client            │
└──────────────┬──────────────┘
               │ WebSocket
               ▼
┌─────────────────────────────┐
│  Gun Relay Server (Render)  │
│  - Persistence Layer        │
│  - Peer Routing             │
└──────────────┬──────────────┘
               │ Optional
               ▼
┌─────────────────────────────┐
│  Gun Mesh Network           │
│  - Additional Peers         │
└─────────────────────────────┘
```

Characteristics:

- Peer-based realtime sync
- Eventual consistency (last-write-wins)
- No central authoritative REST backend
- Client subscribes directly to Gun data graph
- SEA (Security, Encryption, Authorization) for user auth

---

## Core Architectural Principles

1. **Gun.js is the source of truth** for all shared data
2. **React renders derived state only** — no duplicating Gun data
3. **UI mimics Windows XP desktop** behavior exactly
4. **Windows are first-class entities** managed centrally
5. **Realtime over request/response** — no polling
6. **Presence is soft-state** (ephemeral, best-effort)

---

## Client Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────┐
│              BootSequence.js                     │
│  (Panes dX boot animation - POST screen)         │
├─────────────────────────────────────────────────┤
│                   App.js                         │
│  (Desktop Shell + Window Manager + State)        │
├─────────────────────────────────────────────────┤
│                  Pane.js                         │
│  (Generic Window Frame - drag, resize, controls) │
├─────────────────────────────────────────────────┤
│              Application Panes                   │
│  ContactsPane │ ConversationPane │ NotepadPane   │
│  CalculatorPane │ PaintPane │ BrowserPane │ etc  │
├─────────────────────────────────────────────────┤
│                   gun.js                         │
│  (Shared Gun instance + user authentication)     │
└─────────────────────────────────────────────────┘
```

### Component Categories

**Desktop System (App.js)**
- Desktop container with background
- Window manager (open/close/minimize/maximize/focus)
- Taskbar with window tabs
- Start menu
- Toast notification container
- Cascade positioning for new windows

**Window Frame (Pane.js)**
- XP-style title bar with icon
- Window controls (minimize, maximize, close)
- Drag handling (header mousedown)
- Resize handling (corner/edge resizers)
- Z-index management (receives from parent)
- Size/position persistence callbacks

**Application Panes**
- Self-contained functionality
- Receive props from window manager
- Connect to Gun independently
- Follow XP UI conventions

**Shared Services (gun.js)**
```javascript
export const gun = Gun({ peers: [process.env.REACT_APP_GUN_URL] });
export const user = gun.user().recall({ storage: true });
```

---

## Window Manager Architecture

### State Structure (App.js)

```javascript
// Static pane types (from paneConfig.js)
const [panes, setPanes] = useState({
  contacts: { isOpen: false, isMinimized: false, isMaximized: false },
  notepad: { isOpen: false, isMinimized: false, isMaximized: false },
  // ... etc
});

// Dynamic conversation windows
const [conversations, setConversations] = useState({
  // conv_username: { contactName, isOpen, isMinimized, isMaximized }
});

// Z-order tracking
const [paneOrder, setPaneOrder] = useState([]); // Array of pane IDs
const [activePane, setActivePane] = useState(null);

// Size/position persistence (session only)
const [savedSizes, setSavedSizes] = useState({});
const [savedPositions, setSavedPositions] = useState({});
const [cascadeOffset, setCascadeOffset] = useState(0);
```

### Window Lifecycle

```
openPane(name)
  → Add to panes state (isOpen: true)
  → Add to paneOrder array
  → Set as activePane
  → Calculate cascade position if new

closePane(name)
  → Remove from panes state
  → Remove from paneOrder
  → Update activePane to previous

minimizePane(name)
  → Set isMinimized: true
  → Window hidden but in taskbar

focusPane(name)
  → Set as activePane
  → Gets highest z-index
```

### Z-Index Calculation

```javascript
const getZIndex = (paneName) => {
  if (activePane === paneName) return 1000;
  const index = paneOrder.indexOf(paneName);
  return 100 + index;
};
```

### Pane Configuration (paneConfig.js)

```javascript
const paneConfig = {
  contacts: {
    title: 'Chatlon Messenger',
    icon: '👥',
    component: ContactsPane,
    label: 'Contacten',
    defaultSize: { width: 240, height: 500 },
    minSize: { width: 200, height: 400 },
    desktopIcon: 'favicon.ico',
    desktopLabel: 'Chatlon Messenger'
  },
  // ... other panes
};
```

---

## State Architecture

### State Types & Ownership

| State Type | Location | Example |
|------------|----------|---------|
| **UI State** | React useState | Window position, focus, drag state |
| **Session State** | React useState | Saved sizes, cascade offset |
| **Shared Realtime** | Gun.js | Messages, contacts, profiles |
| **Derived State** | Computed | Unread counts, sorted messages |
| **Persistent Local** | localStorage | Last seen timestamps |

### State Rules

1. **Gun data is never duplicated** as authoritative React state
2. React components **subscribe** to Gun nodes via `.on()`
3. Subscriptions **must be cleaned up** on unmount (`.off()`)
4. Use **refs for real-time access** in callbacks (avoid stale closures)
5. **localStorage** only for truly local data (last seen times)

### Example: Message Subscription Pattern

```javascript
// ConversationPane.js
useEffect(() => {
  const chatNode = gun.get(chatRoomId);
  
  chatNode.map().on((data, id) => {
    if (data && data.content) {
      dispatch({ id, ...data });
    }
  });
  
  return () => chatNode.off(); // Cleanup!
}, [chatRoomId]);
```

---

## Gun.js Data Architecture

### Complete Data Graph

```
gun (root)
│
├── users (implicit via SEA)
│   └── ~{publicKey}
│       ├── alias: "username"
│       ├── contacts/
│       │   └── {contactUsername}
│       │       ├── username: string
│       │       ├── status: "accepted"
│       │       └── timestamp: number
│       ├── personalMessage: string
│       ├── notepad: { content: string }
│       └── sentRequests/
│           └── {requestId}: { to, status, timestamp }
│
├── friendRequests/
│   └── {targetUsername}/
│       └── {requestId}
│           ├── from: string
│           ├── status: "pending" | "accepted" | "declined"
│           └── timestamp: number
│
├── contactSync/
│   └── {targetUsername}/
│       └── {contactUsername}
│           ├── username: string
│           ├── addedBy: string
│           └── timestamp: number
│
├── CHAT_{user1}_{user2}/ (alphabetically sorted)
│   └── {messageId}
│       ├── sender: string
│       ├── content: string
│       ├── timestamp: string (display: "14:30")
│       └── timeRef: number (Unix ms)
│
├── NUDGE_{chatRoomId}
│   ├── time: number
│   └── from: string
│
├── TYPING_{chatRoomId}
│   ├── user: string
│   ├── isTyping: boolean
│   └── timestamp: number
│
├── CHAT_MESSAGES/ (public room - legacy)
│   └── {messageId}: { sender, content, timestamp, timeRef }
│
└── CHAT_NUDGES (public room - legacy)
    └── time: number
```

### Chat Room ID Generation

```javascript
const getChatRoomId = (user1, user2) => {
  const sorted = [user1, user2].sort();
  return `CHAT_${sorted[0]}_${sorted[1]}`;
};
// Example: CHAT_alice_bob (always consistent regardless of who initiates)
```

### Data Characteristics

| Data | Mutability | Persistence | Notes |
|------|------------|-------------|-------|
| Messages | Append-only | Permanent | Never deleted |
| Profiles | Mutable | Permanent | User-controlled |
| Contacts | Mutable | Permanent | Add/remove |
| Friend Requests | Mutable | Permanent | Status changes |
| Typing | Ephemeral | None | 3-4 second TTL |
| Nudge | Ephemeral | None | Timestamp comparison |
| Presence | N/A | None | Not yet implemented |

---

## Identity & Authentication

### Gun SEA Integration

```javascript
// gun.js
import Gun from 'gun';
import 'gun/sea';

export const gun = Gun({ peers: [process.env.REACT_APP_GUN_URL] });
export const user = gun.user().recall({ storage: true });
```

### Authentication Flow

```javascript
// Registration
user.create(username, password, (ack) => {
  if (ack.err) { /* handle error */ }
  else { /* auto-login */ }
});

// Login
user.auth(username, password, (ack) => {
  if (ack.err) { /* handle error */ }
  else { /* success: user.is contains identity */ }
});

// Session restore (automatic)
// recall({ storage: true }) restores from localStorage

// Logout
user.leave();
```

### Identity Access

```javascript
if (user.is) {
  const username = user.is.alias;
  const publicKey = user.is.pub;
}
```

### Key Storage

- Private keys stored in localStorage by Gun SEA
- Session persists across page refreshes
- No server-side session management

---

## Chat Model

### 1-on-1 Conversations

- Chat room ID derived from both usernames (alphabetically sorted)
- Both users read/write to same Gun path
- Messages ordered by `timeRef` (Unix timestamp)
- No explicit "conversation" entity — just messages

### Message Flow

```
User A types message
    ↓
gun.get(chatRoomId).set({ sender, content, timestamp, timeRef })
    ↓
Gun syncs to relay server
    ↓
User B's .on() callback fires
    ↓
React state updates via reducer
    ↓
UI re-renders with new message
```

### Typing Indicator

```javascript
// Sender (throttled to 1/second)
gun.get(`TYPING_${chatRoomId}`).put({
  user: username,
  isTyping: true,
  timestamp: Date.now()
});

// Receiver
typingNode.on((data) => {
  if (data.user === contactName && Date.now() - data.timestamp < 4000) {
    setIsContactTyping(true);
  }
});
```

### Nudge System

```javascript
// Sender
gun.get(`NUDGE_${chatRoomId}`).put({ 
  time: Date.now(),
  from: username 
});

// Receiver (with duplicate prevention)
nudgeNode.on((data) => {
  if (data.time > lastProcessedNudge.current && data.from === contactName) {
    lastProcessedNudge.current = data.time;
    // Trigger shake animation + sound
  }
});
```

---

## Notification System

### Toast Notifications (App.js)

```javascript
const [toasts, setToasts] = useState([]);
const shownToastsRef = useRef(new Set()); // Duplicate prevention

const showToast = (toastData) => {
  const toastKey = /* unique key based on type + ID */;
  
  if (shownToastsRef.current.has(toastKey)) return;
  shownToastsRef.current.add(toastKey);
  
  // Play sound
  new Audio('/nudge.mp3').play().catch(() => {});
  
  setToasts(prev => [...prev, { id: toastId, ...toastData }]);
};
```

### Toast Types

| Type | Trigger | Action on Click |
|------|---------|-----------------|
| `message` | New message while conv closed | Open conversation |
| `friendRequest` | New friend request | Open contacts |

### Message Listener Setup

- Listeners created per contact when contacts load
- Ref tracking prevents duplicate listeners
- `listenerStartTimeRef` filters old messages
- Only shows toast if conversation not active

---

## Styling Architecture

### Single CSS File (App.css)

All styles in one file, organized by section:

1. Desktop basis
2. Desktop icons (shortcuts)
3. Window frame (pane-frame)
4. Resizers
5. Chat layout
6. Taskbar
7. Classic OS elements (dx-button, dx-input)
8. Scrollbars
9. Shake animation
10. Login screen
11. Start menu
12. Notepad
13. Panes dX login
14. Calculator
15. Contacts (MSN style)
16. Conversation window
17. Emoticon picker
18. Typing indicator
19. Friend requests
20. Toast notifications
21. Paint
22. Browser
23. Media player

### Panes dX Design Tokens

```css
/* Colors */
--panes-blue: #0058e6;
--panes-blue-light: #2596f3;
--panes-gray: #ECE9D8;
--panes-border: #7F9DB9;
--panes-green: #7AC142;

/* Title bar gradient */
background: linear-gradient(to bottom, 
  #0058e6 0%, #2596f3 9%, #0058e6 18%, 
  #0058e6 92%, #0046ad 100%);

/* Button style */
background: linear-gradient(to bottom, #ECE9D8 0%, #F5F4F2 50%, #ECE9D8 100%);
border-color: #FFFFFF #808080 #808080 #FFFFFF;
```

---

## Deployment Architecture

### Client (Vercel)

```
Build Command: npm run build
Output Directory: build/
Environment Variables (configured in Vercel dashboard):
  - REACT_APP_GUN_URL: https://chatlon-server.onrender.com/gun
```

### Server (Render)

**Repository:** `gun-server` (separate repo)

**Server code (`index.js`):**
```javascript
const express = require('express')
const app = express()
const port = process.env.PORT || 5050;
const Gun = require('gun')
app.use(Gun.serve)
const server = app.listen(port, () => {
  console.log(`Gun server running on port ${port}🔥`)
})
Gun({ web: server })
```

**Structure:**
```
gun-server/
├── node_modules/
├── radata/             # Gun persistence data (auto-created)
├── .gitignore
├── index.js            # Server entry point
├── package.json
└── package-lock.json
```

**Render configuration:**
- **URL:** `https://chatlon-server.onrender.com/gun`
- **Build Command:** `npm install`
- **Start Command:** `node index.js`
- Persistent disk mounted (preserves `radata/`)
- WebSocket support enabled
- CORS configured for client origin

---

## Configuration

### Environment Variables

| Variable | File | Value |
|----------|------|-------|
| `REACT_APP_GUN_URL` | `.env` (production) | `https://chatlon-server.onrender.com/gun` |
| `REACT_APP_GUN_URL` | `.env.local` (development) | `http://127.0.0.1:5050/gun` |

**Note:** `.env.local` overrides `.env` during local development.

### URLs

| Environment | Client | Gun Server |
|-------------|--------|------------|
| Production | Vercel | `https://chatlon-server.onrender.com/gun` |
| Development | `http://localhost:3000` | `http://127.0.0.1:5050/gun` |

### Runtime Configuration

- Gun peers configured at instantiation in `gun.js`
- No feature flags currently
- Debug logging via console.log (remove for production)

---

## Extension Points

### Safe to Extend

- New pane types (add to paneConfig.js)
- New emoticons (emoticons.js)
- New XP UI controls (CSS classes)
- Additional toolbar buttons
- Sound effects

### Requires Design Review

- Gun schema changes (affects all clients)
- Window manager modifications
- Authentication flow changes
- New shared state patterns

---

## AI Invariants (DO NOT BREAK)

These are architectural rules that must never be violated:

| Invariant | Reason |
|-----------|--------|
| Gun message nodes are append-only | Data integrity, no history rewriting |
| No mutation of historical messages | Gun conflict resolution breaks |
| Window focus is managed centrally in App.js | Prevents focus fighting between components |
| Pane registration only via paneConfig.js | Single source of truth for window types |
| No new global state outside App.js | State fragmentation causes sync bugs |
| Single Gun instance from gun.js only | Multiple instances cause data splits |
| Refs for values used in Gun callbacks | Prevents stale closure bugs |
| Timestamps required on all messages | Ordering and deduplication depends on it |
| Friend requests in public Gun space | Private space not readable by other users |

**If you think you need to break one of these, stop and discuss first.**

---

## Anti-Patterns (Do Not Introduce)

- ❌ Replacing Gun with REST without full redesign
- ❌ Adding Redux/Zustand/MobX without approval
- ❌ Flattening desktop window model to modals
- ❌ Introducing CSS frameworks (Tailwind, Bootstrap)
- ❌ Moving realtime logic to polling
- ❌ Storing Gun data in React state as source of truth
- ❌ Multiple Gun instances
- ❌ Using Windows/XP/Microsoft/MSN in code, comments, or UI text

---

## Known Tradeoffs

| Tradeoff | Implication |
|----------|-------------|
| Eventual consistency | Messages may briefly appear out of order |
| Last-write-wins | No conflict resolution for simultaneous edits |
| No server presence | Can't detect true online/offline status |
| Client-side auth only | Username uniqueness not guaranteed |
| Single CSS file | Large but simple to maintain |

---

## AI Collaboration Notes

This project is edited by multiple AI systems.

**Requirements:**

1. Always output **complete files** when modifying code
2. Never silently change Gun schema paths
3. Never rename folders without approval
4. Document architectural changes in this file
5. Test all Gun subscriptions have cleanup
6. Verify refs are used for callback state access