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

### Calls
- Signaling via CALLS/{pairId}
- ICE candidates via CALLS/{pairId}/ice
- Cleanup na hangup is verplicht
- Eén actief gesprek per contactpaar

### TeamTalk
- Channel state via TEAMTALK/channels/{channelId}
- User presence per channel via TEAMTALK/channels/{channelId}/users/{username}
- Signaling via TEAMTALK/signaling/{channelId}
- ICE candidates via TEAMTALK/signaling/{channelId}/ice
- Heartbeat-based presence per channel
- Cleanup na disconnect is verplicht
- Mesh WebRTC: max ~6 users per channel
- Vaste channels + tijdelijke (door gebruikers aangemaakt)

### Encryptie
- E2E encryptie via Gun SEA voor chatberichten
- Diffie-Hellman key exchange per contactpaar
- Gedeelde geheimen gecached per sessie
- Backwards compatible met onversleutelde berichten
- WebRTC audio/video is altijd encrypted (SRTP)

---
## Netwerk Architectuur

### Relay Configuratie
- Primaire relay: Render
- Secundaire relay: Fly.io
- Relays synchroniseren automatisch via Gun protocol
- Clients verbinden met alle beschikbare relays

### Data Persistentie (Selectief)
- Contacten, channels, profielen: lokaal gecached
- Chatberichten: session-only (MSN-authentiek)
- Signaling data: ephemeral, geen storage

### Data Compaction
- Client-side cleanup bij login
- Verwijdert: verlopen signaling, oude ICE, stale presence
- Threshold: 60s voor signaling, 30s voor presence

### Browser Peering (Laag 4)
- Gun WebRTC peering voor directe browser-to-browser sync
- Relay als fallback en discovery
- STUN servers voor NAT traversal

### Superpeers (Laag 5)
- Stabiele clients als vrijwillige relay-peers
- Selectie: >10min online, desktop, opt-in
- Geregistreerd via SUPERPEER/ Gun node

---
## 🔁 Real-Time & Presence

### Presence Model
- Heartbeat-based presence
- Explicit online / offline detection
- No reliance on Gun internal heuristics

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

Minor refactors do **not** belong here.
