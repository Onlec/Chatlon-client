# Chatlon Usage Guide

**Branding Reminder:** This project uses parody names:
- Panes (not Windows)
- dX (not XP)  
- Macrohard (not Microsoft)
- Chatlon (not MSN)

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- A running Gun relay server (or use public relay for testing)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd chatlon-client

# Install dependencies
npm install

# Start development server (uses .env.local → local Gun server)
npm start
```

The app opens at `http://localhost:3000`

### Environment Configuration

```bash
# .env (production - used by Vercel)
REACT_APP_GUN_URL=https://chatlon-server.onrender.com/gun

# .env.local (local development - overrides .env)
REACT_APP_GUN_URL=http://127.0.0.1:5050/gun
```

---

## Running the Gun Server

### Local Development

```bash
# Start local Gun server on port 5050
# (see chatlon-server repository)

# Client automatically connects via .env.local
npm start
```

### Production (Render)

- **URL:** `https://chatlon-server.onrender.com/gun`
- **Repository:** `gun-server` (separate repo)

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

**Render configuration:**
- Build: `npm install`
- Start: `node index.js`
- Persistent disk enabled (preserves `radata/` folder)
- WebSocket support enabled

---

## User Flow

### First Time User

1. Open Chatlon → See login screen
2. Click "Nieuw account aanmaken"
3. Enter username and password (min 4 chars)
4. Click "Account aanmaken"
5. Auto-login after registration
6. Contacts window opens automatically

### Returning User

1. Open Chatlon
2. Session auto-restores if previously logged in
3. Or enter credentials and click "Aanmelden"
4. Desktop loads with contacts

### Adding Contacts

1. In Contacts window, click "+ Contact toevoegen"
2. Enter exact username of person to add
3. Click "Toevoegen"
4. Friend request sent → wait for acceptance

### Receiving Friend Requests

1. Yellow "Vriendenverzoeken" section appears in Contacts
2. See who sent the request
3. Click ✓ to accept or ✗ to decline
4. Accepted contacts appear in contact list

### Starting a Conversation

1. Double-click a contact in the list
2. Conversation window opens
3. Type message in bottom text area
4. Press Enter or click "Verzenden"

### Chat Features

| Action | How |
|--------|-----|
| Send message | Type + Enter |
| Send nudge | Click ⚡ button (5 sec cooldown) |
| Insert emoticon | Click 😊 button → pick from grid |
| See typing | Other person typing shows indicator |

---

## Desktop Experience

The Chatlon desktop mimics the classic Panes dX environment.

### Window Operations

| Action | How |
|--------|-----|
| Move window | Drag title bar |
| Resize window | Drag edges or corner |
| Minimize | Click `_` button |
| Maximize | Click `□` button or double-click title |
| Close | Click `X` button |
| Focus | Click anywhere on window |

### Taskbar

- Shows all open windows
- Click to focus/restore minimized window
- Active window is highlighted
- System clock on right

### Start Menu

- Click "Start" button
- Shows all available applications
- Click app name to open
- "Log Off" to sign out

### Desktop Icons

- Double-click to open application
- Available apps:
  - Chatlon Messenger (contacts)
  - Kladblok (notepad)
  - Rekenmachine (calculator)
  - Macrohard PaneT (paint)
  - Internet Adventurer (browser)
  - Panes Media Player

---

## Application Guide

### Chatlon Messenger (Contacts)

The main contact management window.

**Features:**
- Your avatar and username at top
- Editable personal message ("Wat denk je nu?")
- Status selector (Online/Away/Busy/Offline)
- Add contact button
- Pending friend requests section
- Online contacts list
- Double-click contact to open chat

### Conversation Windows

One window per contact conversation.

**Layout:**
- Menu bar (non-functional, decorative)
- Toolbar with feature buttons
- Message area (left)
- Avatar sidebar (right)
- Input area with emoji/nudge tools

**Message Display:**
- Old messages (from previous session): grayed out
- New messages: highlighted with divider
- Timestamps shown per message

### Kladblok (Notepad)

Simple text editor with Gun persistence.

**Features:**
- Auto-saves to your Gun user space
- Persists across sessions
- Requires login to save

### Rekenmachine (Calculator)

Functional Windows XP calculator.

**Operations:**
- Basic math: + - * /
- Square root, percentage
- Memory functions (MC, MR, MS, M+)

### Macrohard PaneT (Paint)

Canvas drawing application.

**Tools:**
- Pencil, brush, eraser
- Fill bucket
- Line, rectangle, circle
- Color palette
- Line width selector
- Undo and clear

### Internet Adventurer (Browser)

Satirical early-2000s web browser.

**Features:**
- Fake "Yoctol" search page
- Annoying popup ads
- Every click spawns popups
- Close popup → more popups spawn
- Nostalgic bookmark bar

### Panes Media Player

Audio player with visualizations.

**Features:**
- Three visualization modes (bars, wave, circle)
- Sample tracks included
- Custom URL loading
- Play/pause/stop controls
- Volume slider
- Progress seeking

---

## Emoticons

Type these classic chat emoticons for automatic conversion:

### Basic Smileys
| Type | Shows |
|------|-------|
| `:)` | 🙂 |
| `:D` | 😃 |
| `:(` | ☹️ |
| `;)` | 😉 |
| `:P` | 😛 |
| `:$` | 😳 |
| `8)` | 😎 |
| `:@` | 😡 |

### Special
| Type | Shows |
|------|-------|
| `(a)` | 😇 |
| `(6)` | 😈 |
| `(h)` | 😍 |
| `(z)` | 😴 |

### Hearts & Gestures
| Type | Shows |
|------|-------|
| `<3` | ❤️ |
| `</3` | 💔 |
| `(y)` | 👍 |
| `(n)` | 👎 |
| `(k)` | 💋 |

### Objects
| Type | Shows |
|------|-------|
| `(f)` | 🌹 |
| `(^)` | 🎂 |
| `(c)` | ☕ |
| `(b)` | 🍺 |
| `(pi)` | 🍕 |

See `emoticons.js` for complete list.

---

## Toast Notifications

When you receive a message while the conversation is closed/minimized:

1. Toast slides up from bottom-right
2. Shows sender avatar, name, and preview
3. Click toast → opens conversation
4. Auto-dismisses after 5 seconds
5. Sound plays with notification

Friend requests also show as toasts.

---

## Assets

### Sounds

| File | Purpose | Source |
|------|---------|--------|
| `/nudge.mp3` | Nudge notification sound | [Zedge](https://www.zedge.net/ringtones/e7cfcb32-c8b3-3e6f-a642-e30e919f7163) |

### Icons (TODO: Replace)

Current icons are default React placeholders:
- `favicon.ico` — Browser tab icon
- `logo192.png` — PWA icon (small)
- `logo512.png` — PWA icon (large)

These should be replaced with Chatlon-branded assets.

---

## Boot Sequence

When Chatlon loads, it shows a nostalgic Panes dX boot animation:

1. POST screen appears (BIOS-style text)
2. Boot animation plays
3. Login screen or desktop loads

This is handled by `BootSequence.js` and provides an authentic early-2000s experience.

---

## State Behavior

### What Persists (Gun Server)

- User accounts
- Contact lists
- Friend requests
- All messages
- Notepad content
- Personal messages

### What Persists (Browser localStorage)

- Login session
- Last seen message timestamps per chat

### What Doesn't Persist

- Window positions (reset each session)
- Window sizes (reset each session)
- Open windows (reset each session)
- Toast history

---

## Troubleshooting

### "Connection lost" / No messages syncing

1. Check Gun server is running
   - Production: `https://chatlon-server.onrender.com/gun`
   - Local: `http://127.0.0.1:5050/gun`
2. Check correct `.env` / `.env.local` is being used
3. Check browser console for WebSocket errors
4. Try refreshing the page
5. Render free tier may sleep — first request wakes it up (wait 30s)

### Messages appear out of order

- Gun uses eventual consistency
- Wait a moment for sync
- Refresh if persistent

### Login fails

- Password must be 4+ characters
- Username may already exist (try different one)
- Check Gun server connectivity

### Friend request not received

- Both users must be connected to same Gun server
- Check username spelling exactly
- Other user should refresh contacts page

### Nudge not working

- 5 second cooldown between nudges
- Button grays out when on cooldown
- Other user must have window open to see shake

---

## Debug Mode

Open browser developer console to see:

- `[App]` - Main app lifecycle
- `[ContactsPane]` - Contact operations
- `[ConversationPane]` - Message handling

Common debug logs:
```
[App] User is logged in: username
[App] Setting up message listeners for: username
[App] NEW message received from: contact
[ContactsPane] Adding contact: username
[ContactsPane] Friend request sent successfully
```

---

## Deployment Checklist

### Client (Vercel)

- [ ] Set `REACT_APP_GUN_URL=https://chatlon-server.onrender.com/gun` in Vercel environment
- [ ] Build succeeds without errors
- [ ] Test login/registration flow
- [ ] Test message sending/receiving
- [ ] Verify WebSocket connection in browser console

### Server (Render)

- [ ] Persistent storage configured
- [ ] CORS allows Vercel client origin
- [ ] WebSocket upgrades working
- [ ] Server stays running (note: free tier sleeps after inactivity)

---

## Multi-Device Usage

- Same user can log in on multiple devices
- Messages sync across all devices
- Contact lists sync across all devices
- Notepad content syncs across all devices
- Each device has independent window state

---

## Security Notes

- Passwords hashed by Gun SEA
- Private keys stored in browser localStorage
- No server-side password storage
- Messages not end-to-end encrypted (stored in Gun as-is)
- Anyone with Gun access can theoretically read messages

For a private deployment, run your own Gun server and restrict access.