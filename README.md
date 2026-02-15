# 💬 Chatlon

**Early-2000s chat & desktop recreation**  
React + Gun.js + Trystero  
Parody branding: Panes (Windows), dX (XP), Macrohard (Microsoft), Chatlon (MSN)

---

## 🎯 Project Goal

Chatlon recreates the *look, feel and behavior* of early-2000s chat messengers
inside a retro Panes dX-style desktop environment.

The focus is on:
- Authentic UX over modern conventions
- Real-time peer-to-peer messaging
- Simple, hackable architecture
- Minimal abstractions, maximal clarity

> If it wouldn't feel at home in 2004, it probably doesn't belong here.

---

## ✨ Core Features

- 🪟 Panes dX-style desktop with window manager
- 💬 1-on-1 private chat with E2E encryption (Gun.js + SEA)
- 🎧 TeamTalk voice chat — serverless P2P via BitTorrent (Trystero)
- 📞 1-on-1 audio calls (WebRTC via Gun signaling)
- 👥 Contacts & friend requests
- ✍️ Typing indicators & nudges
- 😀 Classic emoticons
- 🔔 Toast notifications
- 🟢 True presence detection (heartbeat-based)
- 🔒 End-to-end encryption for chat messages
- 📡 Relay health monitoring with auto-reconnect
- 🌐 Browser-to-browser peering & superpeer network
- 🧮 Retro desktop apps (Calculator, Notepad, Paint, Media Player, Browser parody)

---

## 🧱 Tech Stack

### Client
- React (functional components only)
- Gun.js + SEA (auth, realtime sync, encryption)
- Trystero (BitTorrent P2P — TeamTalk voice chat)
- Single CSS file (XP-style)
- No external UI or state libraries

### Server
- Gun relay / persistence node
- Hosted on Render
- Required for login and persistent data
- Not required for TeamTalk voice (fully P2P)

---

## 🗂 Project Structure (High Level)

```
src/
├── App.js                  # Central desktop shell & window manager
├── paneConfig.js           # Pane registry
├── gun.js                  # Single Gun instance
├── App.css                 # Complete XP-style UI
├── components/
│   ├── TeamTalkPane.js     # Voice chat (Trystero P2P)
│   └── ...                 # Other pane components
├── hooks/
│   ├── useTrysteroTeamTalk.js  # TeamTalk via Trystero
│   ├── useWebRTC.js            # 1-on-1 calls via Gun
│   ├── useGroupCallMesh.js     # Future: group calls via Gun mesh
│   ├── usePresence.js          # Heartbeat presence
│   ├── useSuperpeer.js         # Superpeer network
│   └── ...
├── utils/
│   ├── encryption.js       # E2E encryption via Gun SEA
│   ├── relayMonitor.js     # Relay health & auto-reconnect
│   ├── gunCleanup.js       # Data compaction
│   └── ...
└── emoticons.js            # Classic emoticon mapping

docs/
├── ARCHITECTURE.md         # Technical source of truth
├── USAGE.md                # User guide & AI workflow
└── TODO.md                 # Informal working list
```

> Detailed rules and schemas live in `ARCHITECTURE.md`.

---

## 🔒 Privacy & Encryption

- Chat messages are end-to-end encrypted via Gun SEA (Diffie-Hellman key exchange)
- WebRTC audio/video is always encrypted (SRTP/DTLS)
- TeamTalk audio is encrypted peer-to-peer (WebRTC via Trystero)
- Gun relay can see metadata but not message content
- Backwards compatible with unencrypted legacy messages

---

## 🎧 TeamTalk

TeamTalk is a voice chat feature inspired by TeamSpeak and Ventrilo.

- Create a server with a name and optional password
- Share the server ID with friends
- Join via server ID — fully peer-to-peer, no server needed
- Audio via BitTorrent tracker signaling + WebRTC
- Per-user volume control and mute
- Speaking detection with visual indicators
- Recent servers saved locally

---

## 🚨 Branding Rules (Non-Negotiable)

Trademarked names are **never** used in code, UI or documentation.

| ❌ Forbidden | ✅ Use Instead |
|-------------|---------------|
| Windows | Panes |
| XP | dX |
| Microsoft | Macrohard |
| MSN | Chatlon |
| TeamSpeak | TeamTalk |

This applies to:
- Variable names
- CSS classes
- Comments
- UI text
- Documentation

---

## 📐 Architectural Principles

- One Gun instance, shared everywhere
- App.js is the **only** global orchestrator
- Window state lives only in App.js
- Functional React components only
- Refs are mandatory inside Gun callbacks
- Authentic behavior > modern UX expectations
- Gun for state & persistence, Trystero for voice transport

> The full architecture and locked schemas are documented in `ARCHITECTURE.md`.

---

## 🤖 AI Development Workflow (Summary)

This project uses **multiple AI roles**:

- **Claude** → primary implementation AI
- **ChatGPT** → documentation & consistency checks
- **Gemini** → debugging & feature design

### Key Rule
Claude **does not rewrite full files** unless explicitly asked.

Claude outputs:
- Exact blocks to replace
- Exact new blocks to insert
- Approximate line numbers or surrounding context

The human developer always integrates changes manually.

➡️ Full AI workflow rules live in `USAGE.md`.

---

## 🚀 Getting Started

```bash
npm install
npm start
```

Local development uses `.env.local` to connect to a local Gun server.
Production uses `.env` with a hosted Gun relay.

See `USAGE.md` for full setup and user flow.

---

## 📄 Documentation Index

| File | Purpose |
|------|---------|
| `README.md` | Project overview (this file) |
| `ARCHITECTURE.md` | Technical source of truth |
| `USAGE.md` | User guide & AI workflow |
| `TODO.md` | Informal working list |

---

## 🧠 Design Philosophy

Chatlon intentionally avoids:
- Modern flat UI patterns
- Heavy abstractions
- Over-engineering
- Feature creep

The goal is clarity, nostalgia and correctness, not scale or polish.

---

## ⚠️ Disclaimer

Chatlon is a nonprofit parody project.
All branding is fictional and intentionally avoids real trademarks.

No affiliation with Microsoft, MSN or Windows exists.