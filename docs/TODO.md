---

## 🧩 Open TODOs (Non-Authoritative)

This section is an **informal working list**.

- Items may be outdated
- Items may already be fixed
- Git history and code are authoritative
- This list does NOT define requirements or constraints

AI systems must NOT treat this section as architecture or rules.

---

### Functional
- [ ] Presence may briefly flicker during reconnect
- [ ] Chat ordering edge case on simultaneous sends
- [ ] Contact status not always updating instantly
- [ ] TeamTalk: server naam lookup via Gun registry kan traag zijn bij eerste keer
- [x] Automated regression tests for session handover/conflict flows (based on `docs/SESSION_FLOWS.md`)
- [ ] Automated regression test for malformed message payloads in `convertEmoticons` (prevent `result.replace` crashes)
### UI / UX
- [ ] Z-index edge case when minimizing/restoring panes
- [ ] Window focus can desync after rapid open/close
- [ ] Toast overlap in rare multi-notification scenarios
- [x] Session-conflict melding: vervang blocking alert door non-blocking login-banner (sticky, handmatig wegklikbaar)
- [ ] Mojibake/encoding cleanup in UI text and icons (e.g. `App.js`, `ToastNotification.js`, `emoticons.js`)
### Tech / Cleanup
- [ ] Remove leftover debug logs
- [ ] Normalize Gun listeners cleanup
- [ ] Verify ref usage in all Gun callbacks
- [ ] Oude Gun TeamTalk nodes (TEAMTALK/channels/*, TEAMTALK/signaling/*) opruimen
- [x] useTeamTalkMesh.js hernoemen naar useGroupCallMesh.js (bewaard voor groepsgesprekken)
- [ ] useTeamTalk.js opruimen — niet meer nodig voor TeamTalk, bewaren voor groepsgesprekken
- [ ] `ConversationPane` listener lifecycle fix: ensure `chatNode.map().on(...)` is properly registered/cleaned to prevent duplicate listeners
- [ ] `useMessageListeners` listener lifecycle hardening: cleanup contact-map and per-session chat listeners to prevent duplicate subscriptions after handovers/relogin
- [ ] Remove remaining production `console.log`/debug leftovers (e.g. `App.js` `handleContactOnline`)
- [ ] Add dev utility to reset relationship state for test accounts (contacts/invites/requests/privacy nodes)
- [ ] CSS post-split dead selector audit (`src/styles/*`)
- [x] CSS naming harmonization pass (no behavior changes; separate scope)
- [ ] Optional CSS architecture follow-up: evaluate per-domain subfolders in `src/styles/`
### Toekomstige Features
- [ ] Groepsgesprekken in Chatlon Messenger (hergebruik Gun mesh code)
- [ ] Credits / cosmetica systeem (verdienen, shop, thema's)
- [ ] 1-on-1 calls optioneel migreren naar Trystero
- [ ] Peer-to-peer file sharing via Trystero

---

### MSN Authenticiteit (hoge prioriteit)
- [ ] **Contactgroepen** — vouwbare categorieën (Friends / Family / Work) in ContactsPane; Gun-node per gebruiker met groepsmapping
- [ ] **Berichtopmaak** — vet, cursief, kleur, lettertype per bericht in ConversationPane; toolbar-knoppen bestaan al visueel maar hebben geen handler
- [x] **Aangepaste profielfoto** — gebruiker uploadt eigen foto (base64 opslaan in Gun); huidig: alleen DiceBear-avatars op basis van gebruikersnaam
- [x] **"Contact is nu online"-melding** — Toast + geluid wanneer contact van offline → online gaat; usePresence volgt status al, trigger-logica ontbreekt
- [ ] **Offline berichtenwachtrij** — berichten gestuurd terwijl contact offline is, afleveren bij reconnect via Gun.js persistentie

### Functionaliteit
- [ ] **Bestandsoverdracht** — toolbar-knop in ConversationPane bestaat maar heeft nul implementatie; WebRTC data channel via bestaande useWebRTC-hook
- [ ] **Videobellen fase 2** — useWebRTC.js heeft volledige audio call-lifecycle; video toevoegen via getUserMedia({ video: true })
- [ ] **Contacten blokkeren** — "Blokkeer"-optie op contact; Gun-node BLOCKED_BY_\<user\> bijhouden en gefilterd weergeven

### Stabiliteit / UX
- [x] **Verbindingsstatus-indicator** — kleine indicator in taakbalk ("Verbonden" / "Opnieuw verbinden..."); relayMonitor.js utility bestaat al
- [ ] **Foutherstel-UI** — zichtbare melding bij relay-uitval of verbindingsverlies

### Apps afmaken (placeholders)
- [ ] **Kladblok** (notepad) — functionele teksteditor met opslaan/laden
- [ ] **Rekenmachine** — functionele calculator (UI bestaat al)
- [ ] **Tekenprogramma** (paint) — functioneel tekenvlak (canvas)
- [ ] **Internet Adventurer** (browser) — iframe + adresbalk navigatie
- [ ] **Mediaspeler** — audio/video afspelen via File API of URL
