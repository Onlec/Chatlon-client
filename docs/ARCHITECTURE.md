# 🧱 Chatlon Architecture (Source of Truth)

This document defines the **non-negotiable technical architecture** of Chatlon.

If something is not described here, it is either:
- an implementation detail, or
- intentionally left flexible

---

## 🔒 Architectural Status

- This document is **authoritative**
- Other documentation may not override it
- AI systems must comply with it at all times

---

## ⚛️ React Architecture Rules

### Component Model
- Functional components only
- No class components
- No external state libraries (Redux, Zustand, etc.)

### State Ownership
- `App.js` is the **single global orchestrator**
- Window state exists **only** in `App.js`
- Panes do not manage global state

### Hooks
- Custom hooks allowed
- Hooks must remain stateless and composable
- Side effects must be explicit and localized

---

## 🪟 Window Manager (Panes dX)

### Core Principles
- Desktop metaphor first
- Windows behave like early-2000s OS panes
- No modern UX shortcuts

### Window State
- Position
- Z-index
- Focus
- Minimized / maximized
- Ownership

All managed centrally by `App.js`.

---

## 🔫 Gun.js Architecture

### Gun Instance
- Exactly **one** Gun instance
- Created in `gun.js`
- Imported everywhere
- Never recreated

### Auth
- Gun SEA is mandatory
- User object is persistent
- Auth state is reactive but centralized

### Data Model Rules
- Users, chats, presence and contacts are separated
- No deeply nested writes
- Flat, explicit graph structure

### Calls (1-on-1)
- Signaling via CALLS/{pairId}
- ICE candidates via CALLS/{pairId}/ice
- Cleanup na hangup is verplicht
- Eén actief gesprek per contactpaar

### Encryptie
- E2E encryptie via Gun SEA voor chatberichten
- Diffie-Hellman key exchange per contactpaar
- Gedeelde geheimen gecached per sessie
- Backwards compatible met onversleutelde berichten
- WebRTC audio/video is altijd encrypted (SRTP)

### Gun Data Schema
- `PRESENCE/{username}` — heartbeat, status
- `ACTIVE_TAB/{username}` — tab/sessie blokkering
- `ACTIVE_SESSIONS/{pairId}` — chat sessie ID's
- `CHAT_{pairId}_{timestamp}` — chatberichten (encrypted)
- `TYPING_{sessionId}` — typing indicators
- `NUDGE_{sessionId}` — nudge events
- `CALLS/{pairId}` — 1-on-1 call signaling
- `friendRequests/{username}` — inkomende verzoeken
- `contactSync/{username}` — contact synchronisatie
- `TEAMTALK_SERVERS/{serverId}` — server registry voor TeamTalk
- `SUPERPEERS/{username}` — superpeer registraties

---

## 🎧 TeamTalk Architecture

### Transport: Trystero (BitTorrent P2P)
- Audio via Trystero rooms, geen eigen server nodig
- Peer discovery via publieke BitTorrent trackers
- WebRTC audio streams via `addStream()`
- Data actions voor nickname en mute state
- Geen Gun signaling nodig voor TeamTalk

### Server Model
- Server aanmaken genereert uniek ID (`tt-xxxxx`)
- Server registry in Gun: `TEAMTALK_SERVERS/{serverId}`
- Verbinden via server-ID of servernaam (matcht tegen registry/recente servers)
- Optioneel wachtwoord per server (Trystero room password)
- Recente servers opgeslagen in localStorage

### Audio
- Lokale stream via `getUserMedia({ audio: true })`
- Mute via `track.enabled` toggle
- Per-user volume control via Audio element
- Speaking detection via Web Audio API analyser
- Stream wordt opnieuw gestuurd bij late peer join

### Relatie met Gun
- Gun: server registry (TEAMTALK_SERVERS), authenticatie
- Trystero: audio transport, peer presence in room, data exchange
- Gun is autoritatief voor welke servers bestaan
- Trystero is autoritatief voor wie in een room zit

### Toekomstig: Groepsgesprekken
- Bestaande Gun mesh code (useGroupCallMesh.js) hergebruikt
- Gun signaling + handmatige WebRTC voor chat + audio
- Invite-based model vanuit Chatlon Messenger
- Gescheiden van TeamTalk (ander use case)

---

## 🌐 Netwerk Architectuur

### Relay Configuratie
- Primaire relay: Render
- Relay is vereist voor login, persistente data, en peer discovery
- Minstens één relay moet online zijn voor nieuwe verbindingen

### Relay Health Monitor
- Periodieke health check (elke 30s)
- Automatische reconnect via `gun.opt()` wanneer relay terugkomt
- Status indicator in taakbalk (🟢 online / 🔴 offline)
- Handmatige force-reconnect mogelijk

### Data Persistentie (Selectief)
- Contacten, profielen: lokaal gecached via Gun
- Chatberichten: persistent in Gun (legacy marking bij venster sluiten)
- Signaling data: ephemeral, geen storage
- TeamTalk servers: Gun registry (persistent)
- Recente TeamTalk servers: localStorage (per client)

### Data Compaction
- Client-side cleanup bij login (5s delay)
- Verwijdert: verlopen signaling, oude ICE, stale presence
- Threshold: 60s voor signaling, 30s voor presence
- Cleanup voor: calls, TeamTalk, presence, active tabs, superpeers

### Browser Peering (Laag 4)
- Gun WebRTC peering voor directe browser-to-browser sync
- Relay als fallback en discovery
- STUN servers voor NAT traversal

### Superpeers (Laag 5)
- Stabiele clients als vrijwillige relay-peers
- Selectie: >10min online, desktop, automatisch opt-in
- Geregistreerd via SUPERPEERS/{username} Gun node
- Heartbeat elke 15s, stale na 30s
- Re-announce elke 60s voor relay recovery

---

## 🔁 Real-Time & Presence

### Presence Model
- Heartbeat-based presence via Gun (primair)
- Explicit online / offline detection
- No reliance on Gun internal heuristics
- TeamTalk presence via Trystero room events (binnen rooms)

### Refs & Callbacks
- **Refs are mandatory** inside Gun callbacks
- Never rely on stale closures
- All reactive values must be ref-backed

---

## 🎨 UI & Styling

### Styling Rules
- Single CSS file (`App.css`)
- XP-style look is mandatory
- No UI frameworks
- No CSS-in-JS

### Authenticity
- Visual glitches are acceptable
- Over-polish is discouraged
- Nostalgia beats accessibility tweaks

---

## 📛 Branding & Naming

Trademarked names are forbidden.

| Forbidden | Use |
|---------|-----|
| Windows | Panes |
| XP | dX |
| Microsoft | Macrohard |
| MSN | Chatlon |
| TeamSpeak | TeamTalk |

Applies to:
- Code
- UI
- Comments
- Documentation

---

## 🚫 Explicit Non-Goals

Chatlon does **not** aim to be:
- Scalable
- Enterprise-ready
- Mobile-first
- Framework-agnostic

The architecture optimizes for:
- Clarity
- Hackability
- Retro correctness

---

## 📌 Change Policy

This document is updated **only when**:
- Core architecture changes
- Gun schema changes
- Window manager rules change
- New transport layers are added

Minor refactors do **not** belong here.