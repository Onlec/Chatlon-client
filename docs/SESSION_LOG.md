# Chatlon — Session Log

Werkdagboek voor AI continuïteit tussen sessies.
Dit bestand vangt informele notities, beslissingen en context op die niet in CHANGELOG horen.

**Voor AI's:** Lees dit bestand aan het begin van elke sessie voor recente context.
**Voor mens:** Voel je vrij om oude entries (>2 weken) te verwijderen.

---

## 2025-02-04 — Sessie 4 (Gemini & Claude)
### Gedaan
- ✅ BUG: Presence heartbeat stuurde altijd 'online' (stale closure).
- ✅ FIX: `userStatusRef` geïmplementeerd in App.js.
- ✅ FEATURE: Handmatige status override (isManualStatus) toegevoegd.
- ✅ FEATURE: "Offline weergeven" (incognito mode) werkt nu naar behoren.
- ✅ TEST: Tabblad sluiten resulteert in directe offline status voor anderen.

---

## 2025-02-03 — Sessie 3 (Claude)

### Context
- Implementatie van True Online/Offline presence met Gun.js heartbeats.
- Voortbouwend op Gemini's plan, met verbeteringen.

### Gedaan
- ✅ App.js uitgebreid met presence heartbeat systeem
  - Heartbeat elke 20 seconden naar `gun.get('presence').get(username)`
  - `beforeunload` handler voor graceful offline bij tab sluiten
  - Auto-away na 5 minuten inactiviteit
  - Status sync met ContactsPane via props
- ✅ ContactsPane.js herschreven met presence detection
  - Luistert naar `gun.get('presence')` voor elk contact
  - Dynamische online/offline berekening (60 sec timeout)
  - Gescheiden lijsten voor online en offline contacten
  - Status indicator kleuren per status type
  - Offline contacten met grijze avatar styling

### Beslissingen
- **PUBLIC space voor presence:** Gebruikers schrijven naar `gun.get('presence').get(username)` in plaats van `user.get('presence')` omdat andere users die data moeten kunnen lezen.
- **60 seconden timeout:** Als geen heartbeat binnen 60 sec, wordt contact als offline getoond.
- **Auto-away:** Na 5 minuten geen mouse/keyboard activiteit, status wordt automatisch "away".
- **Appear-offline:** Wanneer gebruiker deze status kiest, wordt heartbeat nog wel gestuurd (met status 'appear-offline'), maar andere users zien hen als offline.

### Gun Schema Toevoeging
```
gun.get('presence').get({username})
  ├── lastSeen: number (Unix timestamp)
  ├── status: 'online' | 'away' | 'busy' | 'appear-offline' | 'offline'
  └── username: string
```

### Notities voor volgende sessie
- Test de presence flow met 2 browser tabs
- Verify dat beforeunload correct werkt
- Check of auto-away niet te agressief is
- ARCHITECTURE.md moet worden bijgewerkt met presence schema

---

## 2025-02-03 — Sessie 2 (Gemini)

### Context
- Afronden van de grote Branding Cleanup (BUG-011) en voorbereiding op Presence Detection.

### Gedaan
- ✅ Volledige code-audit van 17 bestanden uitgevoerd.
- ✅ Branding volledig gesynchroniseerd tussen CSS en JS.
- ✅ Satirische elementen in BrowserPane.js geïdentificeerd en behouden.
- ✅ Definities voor PaneT en .pane-btn vastgelegd.

### Beslissingen
- De "start" knop behoudt zijn originele tekst ondanks de overstap naar de "Panes" merknaam.
- BrowserPane mag MSN/Microsoft referenties bevatten vanwege de parodiërende aard van de app.

### Roadmap
- Volgende taak: Implementatie van Gun.js heartbeats voor 'True Online/Offline' status.

---

## 2025-02-03 — Sessie 1

### Context
- Volledige codebase review uitgevoerd
- Alle 17 JS bestanden + 6 documentatie bestanden gecontroleerd

### Gedaan
- ✅ Bestandsstructuur geverifieerd (alles aanwezig)
- ✅ BUG-011 aangemaakt in KNOWN_ISSUES.md (branding inconsistenties)
- ✅ SESSION_LOG.md template gemaakt

### Beslissingen
- Branding cleanup (`.msn-*` → `.chat-*`) wordt uitgesteld
- Reden: low priority, veel bestanden tegelijk aanpassen, risico op breaks
- Documentatie heeft voorrang gekregen boven code cleanup

### Ontdekkingen
- 30+ `.msn-*` CSS classes in App.css
- 6+ `.boot-xp-*` CSS classes in App.css
- ConversationPane.js en LoginScreen.js moeten mee-updaten bij CSS rename
- BrowserPane.js heeft "MSN Messenger" bookmark en "Microsoft Support" popup tekst

### Open vragen
- Geen

### Notities voor volgende sessie
- Als branding fix gewenst: begin met App.css, dan ConversationPane.js, dan rest
- Alle renames in één commit om consistency te garanderen

---

## Template

```markdown
## YYYY-MM-DD — Sessie N

### Context
Korte beschrijving van wat de gebruiker wilde bereiken.

### Gedaan
- ✅ Taak 1
- ✅ Taak 2
- ❌ Taak 3 (mislukt, reden: ...)

### Beslissingen
- Beslissing X genomen omdat Y
- Uitgesteld: Z (reden)

### Ontdekkingen
- Onverwachte bevinding 1
- Bug gevonden: ...

### Open vragen
- Vraag die niet beantwoord is

### Notities voor volgende sessie
- Waar te beginnen
- Waar op te letten
- Dependencies of volgorde
```

---

## Archief

Oude sessies kunnen hieronder gearchiveerd worden of verwijderd na ~2 weken.

<!-- Voeg hier oude sessies toe indien gewenst -->