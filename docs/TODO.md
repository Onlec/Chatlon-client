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

### UI / UX
- [ ] Z-index edge case when minimizing/restoring panes
- [ ] Window focus can desync after rapid open/close
- [ ] Toast overlap in rare multi-notification scenarios

### Tech / Cleanup
- [ ] Remove leftover debug logs
- [ ] Normalize Gun listeners cleanup
- [ ] Verify ref usage in all Gun callbacks
- [ ] Oude Gun TeamTalk nodes (TEAMTALK/channels/*, TEAMTALK/signaling/*) opruimen
- [ ] useTeamTalkMesh.js hernoemen naar useGroupCallMesh.js (bewaard voor groepsgesprekken)
- [ ] useTeamTalk.js opruimen — niet meer nodig voor TeamTalk, bewaren voor groepsgesprekken

### Toekomstige Features
- [ ] Groepsgesprekken in Chatlon Messenger (hergebruik Gun mesh code)
- [ ] Credits / cosmetica systeem (verdienen, shop, thema's)
- [ ] 1-on-1 calls optioneel migreren naar Trystero
- [ ] Peer-to-peer file sharing via Trystero

---

### MSN Authenticiteit (hoge prioriteit)
- [ ] **Contactgroepen** — vouwbare categorieën (Friends / Family / Work) in ContactsPane; Gun-node per gebruiker met groepsmapping
- [ ] **Berichtopmaak** — vet, cursief, kleur, lettertype per bericht in ConversationPane; toolbar-knoppen bestaan al visueel maar hebben geen handler
- [ ] **Aangepaste profielfoto** — gebruiker uploadt eigen foto (base64 opslaan in Gun); huidig: alleen DiceBear-avatars op basis van gebruikersnaam
- [ ] **"Contact is nu online"-melding** — Toast + geluid wanneer contact van offline → online gaat; usePresence volgt status al, trigger-logica ontbreekt
- [ ] **Offline berichtenwachtrij** — berichten gestuurd terwijl contact offline is, afleveren bij reconnect via Gun.js persistentie

### Functionaliteit
- [ ] **Bestandsoverdracht** — toolbar-knop in ConversationPane bestaat maar heeft nul implementatie; WebRTC data channel via bestaande useWebRTC-hook
- [ ] **Videobellen fase 2** — useWebRTC.js heeft volledige audio call-lifecycle; video toevoegen via getUserMedia({ video: true })
- [ ] **Contacten blokkeren** — "Blokkeer"-optie op contact; Gun-node BLOCKED_BY_\<user\> bijhouden en gefilterd weergeven

### Stabiliteit / UX
- [ ] **Verbindingsstatus-indicator** — kleine indicator in taakbalk ("Verbonden" / "Opnieuw verbinden..."); relayMonitor.js utility bestaat al
- [ ] **Foutherstel-UI** — zichtbare melding bij relay-uitval of verbindingsverlies

### Apps afmaken (placeholders)
- [ ] **Kladblok** (notepad) — functionele teksteditor met opslaan/laden
- [ ] **Rekenmachine** — functionele calculator (UI bestaat al)
- [ ] **Tekenprogramma** (paint) — functioneel tekenvlak (canvas)
- [ ] **Internet Adventurer** (browser) — iframe + adresbalk navigatie
- [ ] **Mediaspeler** — audio/video afspelen via File API of URL