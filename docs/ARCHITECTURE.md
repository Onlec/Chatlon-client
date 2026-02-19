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

### Messenger Sign-In State
- `messengerSignedIn` leeft in `App.js`, niet in ContactsPane
- Reden: pane sluiten en heropenen mag sign-in niet verliezen
- Systray icon verschijnt na eerste sign-in, toont online status
- Systray "Afsluiten" = sign-out messenger + pane sluiten (niet desktop logoff)

### ConversationPane UI Conventions
- **Kleur-gecodeerde berichten**: eigen berichten krijgen class `self` (naam in donkerblauw `#00008B`), berichten van de ander krijgen class `contact` (naam in donkerrood `#8B0000`)
- **Statusbalk in header**: toont gekleurde status-dot + label naast de contactnaam (via `PRESENCE_MAP`)
- **Stuur-knop**: expliciete "Verzenden"-knop naast het tekstinvoerveld; textarea heeft `resize: none` en vaste hoogte (geen vrije resize door gebruiker)
- **Invoergebied**: flex-layout (`.chat-input-body`), textarea neemt resterende breedte, knop is `64×64px` en gecentreerd via `margin: auto 0`

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
- Identity is e-mail based: `user@coldmail.com` (Gun alias = full email)
- Registration: email (local + domain dropdown) + password + local name
- Supported domains: `@coldmail.com`, `@coldmail.nl`, `@coldmail.net`

### Dual Identity Model
Er zijn twee gescheiden identiteitssystemen:

| | Lokaal account | Chatlon profiel |
|---|---|---|
| **Opslag** | `localStorage` (`chatlon_users`) | Gun (`PROFILES/{email}`) |
| **Naam** | `localName` — getoond in startmenu & login tile | `displayName` — getoond in chat & contactenlijst |
| **Avatar** | `localAvatar` — login tile & startmenu | `avatar` + `avatarType` — chat & contactenlijst |
| **Beheer** | Configuratiescherm → Gebruikersaccount | Chatlon Messenger → Opties |
| **Default** | `localName` = email bij registratie | `displayName` = email bij registratie |

Deze scheiding is bewust: het lokale account is per-device (zoals een Windows gebruiker),
het Chatlon profiel is netwerk-breed (zoals een MSN profiel).

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
All `{email}` keys use the full email address (e.g. `bob@coldmail.com`).

- `PRESENCE/{email}` — heartbeat, status, personalMessage
- `ACTIVE_TAB/{email}` — tab/sessie blokkering
- `ACTIVE_SESSIONS/{pairId}` — chat sessie ID's
- `CHAT_{pairId}_{timestamp}` — chatberichten (encrypted)
- `TYPING_{sessionId}` — typing indicators
- `NUDGE_{sessionId}` — nudge events
- `CALLS/{pairId}` — 1-on-1 call signaling
- `friendRequests/{email}` — inkomende verzoeken
- `contactSync/{email}` — contact synchronisatie
- `TEAMTALK_SERVERS/{serverId}` — server registry voor TeamTalk
- `SUPERPEERS/{email}` — superpeer registraties
- `PROFILES/{email}` — avatar, avatarType, displayName, wallpaper, wallpaperType

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

### localStorage Schema
Lokale per-device data (niet gesynchroniseerd):

- `chatlon_users` — `[{ email, localName, localAvatar }]` — lokale gebruikerslijst (login tiles)
- `chatlon_credentials` — `{ email, password }` — opgeslagen login (auto sign-in)
- `chatlon_remember_me` — `'true'` — of credentials opgeslagen zijn
- `chatlon_settings` — `{ systemSounds, fontSize, colorScheme, ... }` — app-instellingen (via SettingsContext)
- `chatlon_wallpaper` — achtergrond configuratie
- `chatlon_scanlines` — CRT scanlines voorkeur

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

## 📁 Source Structure

```
src/
  components/
    modals/       ← ModalPane, FriendRequestDialog, OptionsDialog,
                     AddContactWizard, AvatarPickerModal,
                     WallpaperPickerModal, ChangePasswordModal
    panes/        ← ChatPane, ContactsPane, ConversationPane,
                     BrowserPane, MediaPane, NotepadPane,
                     PaintPane, CalculatorPane, TeamTalkPane, PinballPane
    screens/      ← LoginScreen, BootSequence
    CallPanel.js
    ControlPane.js
    DropdownMenu.js
    Pane.js
    ToastNotification.js
  contexts/       ← AvatarContext, DialogContext, ScanlinesContext, SettingsContext
  hooks/          ← useSounds, useWebRTC, useGroupCallMesh, …
  utils/          ← debug, chatUtils, encryption, emoticons,
                     gunListenerManager, presenceUtils, …
  App.js          ← global orchestrator (see Window Manager)
  App.css         ← single stylesheet
  gun.js          ← singleton Gun instance
  paneConfig.js   ← pane registry (imports from components/panes/)
  index.js
```

### Rules
- `gun.js` stays in `src/` root — imported by too many files to be moved safely
- `paneConfig.js` stays in `src/` root — avoids circular-path issues with `Pane.js`
- All new screen-level (full-screen) components go in `components/screens/`
- All new modal/dialog components go in `components/modals/`
- All new feature panes go in `components/panes/`
- `emoticons.js` lives in `utils/` — it is data/utility, not a component

---

## 🎨 UI & Styling

### Styling Rules
- Single CSS file (`App.css`)
- XP-style look is mandatory; Frutiger Aero accents (blue gradients, gloss overlays) are allowed
- No UI frameworks
- No CSS-in-JS

### Frutiger Aero Conventions
- Gloss effect via `::before` pseudo-element: `height: 40–50%; background: linear-gradient(to bottom, rgba(255,255,255,0.75), rgba(255,255,255,0))`
- Blue gradients use the range `#D4EAFF → #7AB8F5 → #AAD4FF`
- Status dots get 3D glow: `box-shadow: 0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)`
- Avatar/display-picture borders: `2px solid #7AB8F5; border-radius: 4px`

### React Portals
- Dropdown menus gebruiken `ReactDOM.createPortal` om buiten pane overflow te renderen
- Portal root: `#portal-root` div binnen `.desktop[data-theme]` (erft thema CSS variabelen)
- Positie berekend via `useLayoutEffect` (geen flicker)
- Nooit portalen naar `document.body` (verliest thema context)

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
| Hotmail | Coldmail |
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