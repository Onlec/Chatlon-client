# 🔹 Chatlon | Early-2000s Chat Recreation
**Real-time nostalgic messaging with modern tech** | React + Gun.js  
Parody branding: Windows→Panes, XP→dX, Microsoft→Macrohard, MSN→Chatlon

---

## ✨ Core Goals

* Recreate the feeling of classic early-2000s chat messengers and desktop environments
* Provide realtime chat with presence, contacts, and friend requests
* Maintain retro UI behavior with modern reliability
* Keep the architecture simple and hackable
* Support peer-to-peer messaging without central server dependency

---

## 🧱 Tech Stack

**Client**

* React 18+
* Gun.js client with SEA (Security, Encryption, Authorization)
* Custom XP-style component system
* CSS-only styling (no CSS frameworks)
* Hosted on Vercel

**Server**

* Gun.js relay / persistence node
* Hosted on Render
* Environment variable: `REACT_APP_GUN_URL`

---

## 🗂 Project Structure

```
src/ (17 JavaScript files - Claude focus area)
├── App.js              # ⭐ HIGHEST: Main desktop shell (~350 lines)
├── paneConfig.js       # ⭐ HIGH: Window type registry (~80 lines)
├── gun.js              # ⭐ HIGH: Gun instance + auth (~40 lines)
├── App.css             # ⭐ MEDIUM: All XP styling (~1000+ lines)
├── components/
│   ├── BootSequence.js     # Boot animation
│   ├── ContactsPane.js     # Contact management
│   ├── ConversationPane.js # 1-on-1 chat windows
│   ├── MediaPane.js        # Audio player
│   ├── BrowserPane.js      # Satirical browser
│   ├── PaintPane.js        # Canvas paint app
│   ├── CalculatorPane.js   # Working calculator
│   ├── NotepadPane.js      # Text editor
│   ├── LoginScreen.js      # Authentication UI
│   ├── Pane.js             # Generic window frame
│   └── ToastNotification.js # Popup notifications
├── hooks/                  # Custom React hooks (4 files)
│   ├── useToasts.js
│   ├── usePresence.js
│   ├── usePaneManager.js
│   └── useMessageListeners.js
├── emoticons.js        # Classic emoticon conversion
└── archief/            # Legacy/backup files

public/
├── favicon.ico         # App icon (TODO: replace with Chatlon logo)
├── index.html          # Root HTML template
├── logo192.png         # PWA icon 192x192 (TODO: replace)
├── logo512.png         # PWA icon 512x512 (TODO: replace)
├── manifest.json       # PWA manifest
├── nudge.mp3           # Nudge notification sound
└── robots.txt          # Search engine config
```

### Gun Server (separate repository: `gun-server`)

```
gun-server/
├── node_modules/
├── radata/             # Gun persistence data
├── .gitignore
├── index.js            # Express + Gun server
├── package.json
└── package-lock.json
```

---

## 🪟 Window System

The desktop uses a custom window manager supporting:

| Feature | Implementation |
|---------|---------------|
| Drag | Mouse events on header |
| Resize | Corner/edge resizers |
| Minimize | Hide + taskbar indicator |
| Maximize | Full viewport mode |
| Focus/z-index | Centralized in App.js |
| Cascade | Auto-offset for new windows |

Window types are registered in `paneConfig.js` with:
- Default/minimum sizes
- Component reference
- Desktop icon
- Taskbar label

---

## 🔄 Data Layer (Gun.js)

### Authentication
Gun SEA handles user creation and login:
```javascript
user.create(username, password, callback)
user.auth(username, password, callback)
user.leave() // logout
```

Sessions persist via `recall({ storage: true })`.

### Data Paths

| Path | Purpose | Type |
|------|---------|------|
| `user.get('contacts')` | User's accepted contacts | Map |
| `user.get('personalMessage')` | Status message | String |
| `user.get('notepad')` | Notepad content | Object |
| `gun.get('friendRequests/{username}')` | Incoming friend requests | Map |
| `gun.get('contactSync/{username}')` | Contact sync when accepted | Map |
| `gun.get('CHAT_{user1}_{user2}')` | Private messages (sorted alphabetically) | Set |
| `gun.get('NUDGE_{chatRoomId}')` | Nudge signals | Object |
| `gun.get('TYPING_{chatRoomId}')` | Typing indicators | Object |
| `gun.get('CHAT_MESSAGES')` | Public chat room (legacy) | Set |
| `gun.get('CHAT_NUDGES')` | Public chat nudges | Object |

### Message Structure
```javascript
{
  sender: "username",
  content: "message text",
  timestamp: "14:30",        // Display format
  timeRef: 1234567890123     // Unix ms for sorting
}
```

---

## 👥 Contact & Presence System

### Friend Request Flow
1. User A sends request → writes to `gun.get('friendRequests/{userB}')`
2. User B sees pending request in ContactsPane
3. User B accepts → writes to own `user.get('contacts')` + `gun.get('contactSync/{userA}')`
4. User A's listener picks up sync → adds User B to contacts

### Presence
- Status stored locally (online/away/busy/offline)
- No server-side presence heartbeat currently
- Contact list shows all accepted contacts as "online"

---

## 💬 Chat Features

| Feature | Status |
|---------|--------|
| 1-on-1 messaging | ✅ Working |
| Typing indicators | ✅ Working |
| Nudge (shake) | ✅ Working |
| Emoticons | ✅ 50+ classic MSN emoticons |
| Read receipts | ✅ Local (localStorage based) |
| "New messages" divider | ✅ Working |
| Message history | ✅ Persisted in Gun |
| Winks | ❌ Not implemented |
| Games | ❌ Not implemented |
| Voice chat | ❌ Not implemented |
| Video chat | ❌ Not implemented |
| Group chat | ❌ Not implemented |
| File sharing | ❌ Not implemented |

---

## 🎨 Design Rules

* UI must feel like Panes dX — faithful to the early 2000s aesthetic
* Use Panes dX color palette: `#0058e6` (title bar), `#ECE9D8` (background), `#7F9DB9` (borders)
* Buttons use `linear-gradient` with highlight/shadow borders
* No modern flat UI patterns
* No CSS frameworks (Tailwind, Bootstrap, etc.)
* Animations: shake for nudge, toast slide-in, that's it
* Font: Tahoma, MS Sans Serif
* **Never use trademarked names** — use Panes/dX/Macrohard/Chatlon instead

---

## 🚀 Deployment

**Client (Vercel)**
```bash
npm install
npm run build
# Deploy build/ folder
```

Environment variables:
```bash
# .env (production)
REACT_APP_GUN_URL=https://chatlon-server.onrender.com/gun

# .env.local (local development)
REACT_APP_GUN_URL=http://127.0.0.1:5050/gun
```

**Server (Render)**
- URL: `https://chatlon-server.onrender.com/gun`
- Runs Gun relay with persistence
- Must maintain storage between restarts
- CORS must allow client origin

---

## 🧪 Development

```bash
# Install dependencies
npm install

# Start development server (uses .env.local)
npm start

# Build for production (uses .env)
npm run build
```

For local Gun server testing:
```bash
# Start local Gun server on port 5050
# (see server repository for setup)

# Client will connect to http://127.0.0.1:5050/gun
npm start
```

---

## ⚠️ AI Warning

This project uses **Gun.js eventual consistency**. 

**DO NOT attempt to "fix" perceived race conditions with:**
- Locks or mutexes
- Artificial delays or setTimeout
- Polling instead of subscriptions
- Multiple Gun instances
- Caching Gun data in separate state

**Window management is centralized in App.js.**

**DO NOT:**
- Add focus handlers inside individual panes
- Manage window state outside App.js
- Create new global state stores

**When in doubt, read ARCHITECTURE.md first.**

---

## 🤖 Claude Development Workflow

### For Claude Sessions:
**Repository**: Connected via GitHub Project Knowledge  
**Response Format**: Line-specific replacements ONLY  
**Current Priority**: Maintenance and feature additions

#### Claude Instructions Template:
```markdown
File: src/example.js
Line: 42
Old: const windowsRef = useRef(null);
New: const panesRef = useRef(null);
Why: Branding consistency
```

#### Key Files for Modifications:
1. **src/App.js** - Desktop shell, window manager, auth flow
2. **src/paneConfig.js** - Register new panes/applications  
3. **src/gun.js** - Database configuration
4. **src/components/*.js** - Individual application logic

#### What Claude Should NOT Output:
- ❌ Complete files (wastes message limits)
- ❌ "// ... rest unchanged" snippets
- ❌ Assumptions about variable naming
- ❌ Multiple files in single response

#### What Claude SHOULD Output:
- ✅ Exact line numbers and targeted changes
- ✅ Clear reasoning for modifications
- ✅ Single-file focused modifications
- ✅ Wait for approval on multi-file changes

### Current Status:
- **Codebase**: 17 JS files, ~1500 total lines
- **Known Issues**: See KNOWN_ISSUES.md for current bugs
- **Priority Queue**: Managed in KNOWN_ISSUES.md

---

## 📋 Known Issues & TODO

### Assets
- [ ] Replace favicon.ico with Chatlon logo
- [ ] Replace logo192.png with Chatlon logo
- [ ] Replace logo512.png with Chatlon logo
- [ ] Update manifest.json with Chatlon branding

### Features
- [ ] True online/offline presence detection
- [ ] Group chat support
- [ ] Winks support
- [ ] Games support
- [ ] Voice chat
- [ ] Video chat
- [ ] File/image sharing
- [ ] Sound settings persistence
- [ ] Window position persistence across sessions
- [ ] Mobile responsive design
- [ ] Offline message queue

---

## 📄 License

MIT