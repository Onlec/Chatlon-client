# Changelog

Alle noemenswaardige wijzigingen aan het Chatlon project.

---

NEW_SECTION:

---

## Template for Claude Sessions
```markdown
### [YYYY-MM-DD] - Claude Session: [Brief Description]
**TYPE:** [CODE_CHANGE / BUG_FIX / FEATURE_ADD / REFACTOR]  
**AREA:** [component-name / system-area]  
**SUMMARY:** One-line description of what was accomplished

**WHY:** Business/technical justification for the change

**FILES MODIFIED:**
- `src/ComponentName.js` - Line XX: [specific change description]
- `src/App.css` - Section XX: [styling changes]
- `src/paneConfig.js` - Added: [new pane registration]

**CLAUDE IMPLEMENTATION NOTES:**
- Used [pattern/approach] for consistency with existing code
- Followed [specific guideline] from CONTRIBUTING.md
- Tested [specific scenarios] during development

**FOLLOW-UP REQUIRED:**
- [ ] Manual testing by human
- [ ] Documentation update needed
- [ ] Additional features to consider

**ARCHITECTURE IMPACT:** [none / low / medium / high]  
**DATA/SCHEMA IMPACT:** [none / additive / breaking]

---
```

### Entry Guidelines for AI Sessions:
- **One entry per session**, regardless of number of files changed
- **Focus on WHY**, not just what files were touched
- **Include specific line numbers** for major changes
- **Note any deviations** from standard patterns
- **Flag follow-up requirements** clearly

## [Unreleased] - Branding Cleanup

**TYPE:** refactor

**AREA:** ui, documentation

**SUMMARY:**
Code aanpassen om alle Windows/XP/Microsoft/MSN referenties te vervangen met Panes/dX/Macrohard/Chatlon. Documentatie is reeds bijgewerkt, code moet nog volgen.

**WHY:**
Trademark vermijding en consistente project branding.

**FILES TOUCHED:**
- src/App.css (class names, comments)
- src/LoginScreen.js (UI tekst)
- src/BootSequence.js (UI tekst)
- src/ConversationPane.js (comments)
- src/ContactsPane.js (comments)
- public/favicon.ico (vervangen)
- public/logo192.png (vervangen)
- public/logo512.png (vervangen)
- public/manifest.json (app name)

**ARCHITECTURE IMPACT:** none

**DATA / SCHEMA IMPACT:** none

**AI NOTES:**
Documentatie (README, ARCHITECTURE, USAGE, CONTRIBUTING) is al bijgewerkt met branding regels. Gebruik nooit Windows/XP/Microsoft/MSN in nieuwe code.

**FOLLOW-UP:**
- Ontwerp Chatlon logo
- Vervang alle placeholder icons

---

## [0.6.0] — 2025-02-03

### Refactor
- **Branding:** Volledige migratie van legacy MSN/Microsoft branding naar Chatlon/Macrohard.
- **Styling:** CSS architectuur opgeschoond; prefixes genormaliseerd naar `.chat-` en `.pane-`.
- **Naming:** Paint applicatie formeel hernoemd naar "PaneT" binnen de code-configuratie.

---

## [0.5.0] - Desktop Applicaties

**TYPE:** feature

**AREA:** media-player, browser, paint, architecture

**SUMMARY:**
Drie nieuwe desktop applicaties toegevoegd: MediaPane (audio player met visualisaties), BrowserPane (satirische "Internet Adventurer" met popup chaos), en PaintPane (canvas tekenprogramma "Macrohard PaneT"). Ook paneConfig.js systeem geïntroduceerd voor centrale pane registratie.

**WHY:**
Meer nostalgische desktop ervaring bieden met functionele applicaties die de Panes dX sfeer versterken.

**FILES TOUCHED:**
- src/MediaPane.js (nieuw)
- src/BrowserPane.js (nieuw)
- src/PaintPane.js (nieuw)
- src/paneConfig.js (nieuw)
- src/App.js (pane registry integratie)
- src/App.css (styling voor alle nieuwe panes)

**ARCHITECTURE IMPACT:** medium
- Nieuw paneConfig.js systeem vervangt hardcoded pane definities
- Alle pane types nu centraal geregistreerd met defaultSize, minSize, component, icons
- App.js gebruikt paneConfig voor rendering en taskbar

**DATA / SCHEMA IMPACT:** none

**AI NOTES:**
Nieuwe panes toevoegen via paneConfig.js, niet direct in App.js. Volg bestaand patroon: component maken, CSS toevoegen in App.css sectie, registreren in paneConfig.

**FOLLOW-UP:**
- Audio streaming URLs toevoegen
- Paint: save/load functionaliteit

---

## [0.4.0] - Chat Verbeteringen

**TYPE:** feature

**AREA:** chat-ui, notifications, gun-sync

**SUMMARY:**
Uitgebreide chat functionaliteit: emoticons systeem met 50+ klassieke chat emoticons en picker UI, typing indicator met throttling, read receipts via localStorage, "nieuwe berichten" divider, en toast notificaties voor berichten wanneer conversation window niet actief is.

**WHY:**
Authentieke chat messenger ervaring repliceren met alle verwachte features uit het tijdperk.

**FILES TOUCHED:**
- src/emoticons.js (nieuw)
- src/ToastNotification.js (nieuw)
- src/ConversationPane.js (emoticons, typing, read receipts)
- src/App.js (toast systeem, message listeners)
- src/App.css (emoticon picker, toast styling, typing indicator)

**ARCHITECTURE IMPACT:** medium
- Toast notificatie systeem in App.js met refs voor duplicate prevention
- Message listeners per contact met listenerStartTimeRef
- localStorage gebruikt voor lastSeen timestamps

**DATA / SCHEMA IMPACT:** additive
- `TYPING_{chatRoomId}` - typing indicator signals
- `user.get('personalMessage')` - status message

**AI NOTES:**
- Emoticons staan in emoticons.js, convertEmoticons() voor rendering
- Toast duplicate check gebruikt shownToastsRef (niet state) voor synchrone check
- Typing throttled to 1x per seconde via lastTypingSignal ref
- Read receipts zijn LOCAL only (localStorage), niet via Gun

**FOLLOW-UP:**
- Winks implementeren
- Custom emoticon upload

---

## [0.3.0] - Contacten & Friend Requests

**TYPE:** feature

**AREA:** contacts, gun-sync, presence

**SUMMARY:**
Volledig contactensysteem geïmplementeerd: ContactsPane met chat-stijl UI, friend request flow (versturen/ontvangen/accepteren/weigeren), automatische contact sync bij acceptatie, personal message editing, en status selector (online/away/busy/offline).

**WHY:**
Kern sociale functionaliteit voor 1-op-1 chat - gebruikers moeten elkaar kunnen vinden en toevoegen.

**FILES TOUCHED:**
- src/ContactsPane.js (nieuw)
- src/App.js (openConversation callback)
- src/App.css (contacts styling, friend requests, status indicators)

**ARCHITECTURE IMPACT:** high
- Friend requests via PUBLIC Gun paths (niet user space) zodat andere users ze kunnen zien
- Contact sync via aparte public path voor bi-directionele toevoeging
- ContactsPane krijgt onOpenConversation prop van App.js

**DATA / SCHEMA IMPACT:** additive
- `gun.get('friendRequests/{username}/{requestId}')` - incoming requests (public)
- `gun.get('contactSync/{username}/{contactName}')` - sync na acceptatie (public)
- `user.get('contacts/{username}')` - eigen contactenlijst (private)
- `user.get('sentRequests/{requestId}')` - verstuurde verzoeken (private)

**AI NOTES:**
- Friend requests MOETEN in public space (`gun.get()`) niet user space (`user.get()`)
- Contact sync is nodig omdat alleen request ontvanger kan accepteren
- Bij acceptatie: schrijf naar eigen contacts EN naar contactSync van andere user
- Status is momenteel alleen lokaal, geen echte presence detection

**FOLLOW-UP:**
- True presence detection via heartbeat
- Block/remove contact functionaliteit
- Contact groepen/categorieën

---

## [0.2.0] - Conversation Windows

**TYPE:** feature

**AREA:** chat-ui, window-manager, gun-sync

**SUMMARY:**
Individuele conversation windows per contact geïmplementeerd. Private chat rooms met consistent ID patroon (alfabetisch gesorteerd), nudge functionaliteit met shake animatie en geluid, en dynamisch window beheer voor meerdere gelijktijdige gesprekken.

**WHY:**
Core chat functionaliteit - gebruikers moeten privé kunnen chatten met individuele contacten in aparte vensters.

**FILES TOUCHED:**
- src/ConversationPane.js (nieuw)
- src/App.js (conversations state, dynamic pane management)
- src/App.css (conversation styling, nudge animation)
- public/nudge.mp3 (nieuw)

**ARCHITECTURE IMPACT:** high
- App.js nu met apart `conversations` state object naast `panes`
- Dynamische pane IDs: `conv_{contactName}`
- getChatRoomId() helper voor consistente room IDs
- Nudge via aparte Gun path per chatroom

**DATA / SCHEMA IMPACT:** additive
- `gun.get('CHAT_{user1}_{user2}')` - private messages (users alfabetisch gesorteerd)
- `gun.get('NUDGE_{chatRoomId}')` - nudge signals met timestamp + from

**AI NOTES:**
- Chat room ID ALTIJD via getChatRoomId() - sorteert alfabetisch voor consistentie
- Conversations state is APART van panes state (dynamisch vs statisch)
- Nudge gebruikt lastProcessedNudge ref om duplicates te voorkomen
- Nudge cooldown is 5 seconden

**FOLLOW-UP:**
- Typing indicators
- Message read receipts
- Emoticons

---

## [0.1.0] - Basis Infrastructuur

**TYPE:** architecture

**AREA:** window-manager, authentication, gun-sync, desktop

**SUMMARY:**
Volledige basis infrastructuur opgezet: BootSequence met POST screen animatie, LoginScreen met Gun SEA authenticatie, desktop shell met Panes dX styling, window manager met drag/resize/minimize/maximize, taskbar met tabs en klok, start menu, en drie basis applicaties (Notepad, Calculator, legacy public ChatPane).

**WHY:**
Fundament leggen voor de volledige Panes dX desktop ervaring met werkende authenticatie en window management.

**FILES TOUCHED:**
- src/App.js (desktop shell, window manager, taskbar, start menu)
- src/App.css (volledige Panes dX styling)
- src/Pane.js (generic window component)
- src/BootSequence.js (nieuw)
- src/LoginScreen.js (nieuw)
- src/NotepadPane.js (nieuw)
- src/CalculatorPane.js (nieuw)
- src/ChatPane.js (nieuw - public chat)
- src/gun.js (nieuw)

**ARCHITECTURE IMPACT:** high
- Centrale Gun instantie in gun.js, gedeeld door alle components
- Window manager in App.js met panes state, paneOrder, activePane
- Pane.js als generic wrapper met alle window chrome
- SEA authenticatie met session recall

**DATA / SCHEMA IMPACT:** additive
- `user.get('notepad')` - notepad content persistence
- `gun.get('CHAT_MESSAGES')` - public chatroom (legacy)
- `gun.get('CHAT_NUDGES')` - public chat nudges (legacy)

**AI NOTES:**
- gun.js exporteert `gun` en `user` - importeer ALLEEN van hier, maak nooit nieuwe Gun instantie
- Pane.js handled alle window chrome - apps renderen alleen hun content
- Window state (open/minimized/maximized) in App.js, niet in individuele panes
- Session persists via recall({ storage: true }) - check user.is voor login status

**FOLLOW-UP:**
- Private 1-op-1 chat
- Contactenlijst
- Friend requests

---

## [0.0.1] - Project Start

**TYPE:** infra

**AREA:** setup

**SUMMARY:**
Initiële project setup met Create React App, Gun.js dependency toegevoegd, basis CSS structuur aangemaakt, eerste window prototype gebouwd.

**WHY:**
Project bootstrappen met juiste tooling en dependencies.

**FILES TOUCHED:**
- package.json (nieuw)
- src/index.js (nieuw)
- src/App.js (nieuw)
- src/App.css (nieuw)
- public/index.html (nieuw)

**ARCHITECTURE IMPACT:** high
- React als UI framework
- Gun.js als realtime data layer
- Single CSS file approach

**DATA / SCHEMA IMPACT:** none

**AI NOTES:**
- Project gebruikt Create React App, geen custom webpack
- Geen TypeScript, puur JavaScript
- Alle styling in App.css, geen CSS modules of styled-components

**FOLLOW-UP:**
- Login systeem
- Window manager
- Desktop shell

---

## Gun Schema Reference

Volledige lijst van alle Gun paths in het project:

| Path | Type | Versie | Beschrijving |
|------|------|--------|--------------|
| `user.get('notepad')` | Private | 0.1.0 | Notepad content |
| `user.get('contacts/{username}')` | Private | 0.3.0 | Contactenlijst |
| `user.get('sentRequests/{id}')` | Private | 0.3.0 | Verstuurde friend requests |
| `user.get('personalMessage')` | Private | 0.4.0 | Status message |
| `gun.get('CHAT_MESSAGES')` | Public | 0.1.0 | Legacy public chatroom |
| `gun.get('CHAT_NUDGES')` | Public | 0.1.0 | Legacy public nudges |
| `gun.get('CHAT_{u1}_{u2}')` | Public | 0.2.0 | Private chat messages |
| `gun.get('NUDGE_{roomId}')` | Public | 0.2.0 | Private chat nudges |
| `gun.get('friendRequests/{user}/{id}')` | Public | 0.3.0 | Incoming friend requests |
| `gun.get('contactSync/{user}/{contact}')` | Public | 0.3.0 | Contact sync na accept |
| `gun.get('TYPING_{roomId}')` | Public | 0.4.0 | Typing indicators |