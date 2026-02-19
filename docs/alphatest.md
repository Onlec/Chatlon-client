# Chatlon Alpha Test Checklist

Versie: Alpha 0.1
Datum: 2026-02-19
Basis: ARCHITECTURE.md + README.md

> Deze checklist dekt alle kernfunctionaliteit van Chatlon.
> Test met **minimaal 2 clients** (verschillende browsers of incognito tabs).
> Markeer elke test met: [x] geslaagd / [ ] niet getest / [!] gefaald (+ notitie)

---

## 1. Boot & Login

### Boot Sequence
- [ ] POST/BIOS scherm verschijnt bij eerste keer laden
- [ ] Memory test animatie loopt correct af
- [ ] Panes dX boot splash wordt getoond
- [ ] Toets "S" toggle scanlines effect tijdens boot
- [ ] Na boot verschijnt het login scherm

### Registratie
- [ ] Nieuw account aanmaken met @coldmail.com
- [ ] Nieuw account aanmaken met @coldmail.nl
- [ ] Nieuw account aanmaken met @coldmail.net
- [ ] Lokale naam wordt correct opgeslagen
- [ ] Account verschijnt als login tile na registratie
- [ ] Maximaal 5 opgeslagen gebruikers op login scherm

### Inloggen
- [ ] Inloggen met correct wachtwoord
- [ ] Foutmelding bij verkeerd wachtwoord
- [ ] "Remember me" checkbox slaat credentials op
- [ ] Auto sign-in werkt na page refresh (met remember me aan)
- [ ] Multi-tab blokkering: tweede tab met zelfde account wordt geblokkeerd
- [ ] Login-geluid speelt af na succesvol inloggen

### Uitloggen
- [ ] Log Off knop in Start Menu werkt
- [ ] Logoff-geluid speelt af
- [ ] Terugkeer naar login scherm
- [ ] Presence wordt op offline gezet na uitloggen

---

## 2. Desktop Omgeving

### Desktop
- [ ] Bureaublad wordt geladen met achtergrond
- [ ] Desktop iconen worden getoond
- [ ] Dubbelklik op icoon opent bijbehorende pane
- [ ] Achtergrond is aanpasbaar (wallpaper)

### Start Menu
- [ ] Start knop opent Start Menu
- [ ] Gebruikersnaam en avatar worden getoond bovenaan
- [ ] Alle panes staan in de lijst
- [ ] Klik op item opent de juiste pane
- [ ] "Afmelden" knop werkt
- [ ] Start Menu sluit bij klik buiten het menu

### Taakbalk
- [ ] Open panes verschijnen als tabs in de taakbalk
- [ ] Klik op tab brengt pane naar de voorgrond
- [ ] Klik op actieve tab minimaliseert de pane
- [ ] Unread message indicators worden getoond
- [ ] Klok wordt correct weergegeven in systray

### Systray
- [ ] Relay status indicator (groen = online / rood = offline)
- [ ] Klik op rode relay indicator triggert force-reconnect
- [ ] Superpeer badge verschijnt na 10+ minuten online
- [ ] Superpeer badge toont aantal verbonden peers
- [ ] Chatlon status selector (online/away/busy/appear offline)

---

## 3. Pane/Window Manager

### Window Gedrag
- [ ] Panes zijn versleepbaar via titelbalk
- [ ] Panes zijn resizable (formaat aanpasbaar)
- [ ] Minimaliseren knop werkt
- [ ] Maximaliseren knop werkt
- [ ] Dubbelklik op titelbalk maximaliseert/herstelt
- [ ] Sluiten knop sluit de pane
- [ ] Focus: klik op pane brengt deze naar voorgrond (z-index)
- [ ] Meerdere panes tegelijk geopend: correcte z-index stacking
- [ ] Cascade positionering bij openen nieuwe panes
- [ ] Geminimaliseerde pane herstellen via taakbalk

---

## 4. Chatlon Messenger (ContactsPane)

### Sign-In
- [ ] Messenger sign-in scherm verschijnt in ContactsPane
- [ ] Sign-in met Gun credentials werkt
- [ ] Auto sign-in optie werkt
- [ ] Systray icon verschijnt na sign-in
- [ ] Pane sluiten en heropenen behoudt sign-in status (state in App.js)

### Contactenlijst
- [ ] Contacten worden geladen en weergegeven
- [ ] Online contacten gegroepeerd bovenaan
- [ ] Offline contacten gegroepeerd onderaan
- [ ] Groepen zijn inklapbaar/uitklapbaar
- [ ] Avatar en displaynaam per contact zichtbaar
- [ ] Status indicator (kleur) per contact correct

### Contact Toevoegen
- [ ] "Contact toevoegen" wizard opent
- [ ] Emailadres invoeren en verzoek versturen
- [ ] Ontvanger krijgt friend request notificatie
- [ ] Accepteren voegt contact toe aan beide lijsten
- [ ] Weigeren verwijdert het verzoek

### Persoonlijke Status
- [ ] Eigen status wijzigen (online/away/busy/appear offline)
- [ ] Persoonlijk bericht instellen
- [ ] Status update zichtbaar voor contacten

---

## 5. 1-on-1 Chat (ConversationPane)

### Basis Chat
- [ ] Dubbelklik op contact opent conversatie-pane
- [ ] Bericht typen en verzenden werkt
- [ ] Berichten verschijnen bij beide partijen
- [ ] Tijdstempel wordt correct weergegeven
- [ ] Sender naam/avatar wordt getoond
- [ ] Auto-scroll naar nieuwste berichten

### Encryptie (E2E)
- [ ] Berichten worden encrypted verzonden (Gun SEA)
- [ ] Berichten worden correct decrypted bij ontvangst
- [ ] Backwards compatible met onversleutelde berichten

### Typing Indicators
- [ ] "X is typing..." verschijnt bij de ontvanger
- [ ] Indicator verdwijnt na stoppen met typen

### Nudge
- [ ] Nudge knop verzenden
- [ ] Ontvanger ziet window shake animatie
- [ ] Nudge geluid speelt af bij ontvanger
- [ ] Cooldown voorkomt nudge-spam

### Emoticons
- [ ] Text emoticons worden omgezet (:) naar smiley, etc.)
- [ ] Emoticon picker is beschikbaar
- [ ] Emoticons worden correct weergegeven

### Toast Notificaties
- [ ] Inkomend bericht toont toast notificatie
- [ ] Toast toont afzender en berichtpreview
- [ ] Klik op toast opent conversatie-pane
- [ ] Toast verdwijnt automatisch na 5 seconden

---

## 6. Presence & Status

### Heartbeat Systeem
- [ ] Online status wordt bijgewerkt (heartbeat elke 20s)
- [ ] Gebruiker gaat offline na 60s zonder heartbeat
- [ ] Auto-away na 5 minuten inactiviteit
- [ ] Status herstelt naar online bij activiteit na away

### Status Weergave
- [ ] Groen = online
- [ ] Geel = away
- [ ] Rood = busy
- [ ] Grijs = appear offline / offline
- [ ] Status correct zichtbaar voor alle contacten

---

## 7. Audio Calls (WebRTC)

### Uitgaand Gesprek
- [ ] Bel-knop in conversatie-pane werkt
- [ ] Call state: calling -> ringing -> connected
- [ ] Audio stream wordt correct opgezet
- [ ] Mute knop werkt (eigen microfoon)
- [ ] Ophangen beindigt gesprek correct
- [ ] Cleanup na hangup (Gun signaling opgeruimd)

### Inkomend Gesprek
- [ ] Inkomend gesprek notificatie verschijnt
- [ ] Opnemen start audio verbinding
- [ ] Weigeren beindigt het gesprek
- [ ] Gespreksduur wordt weergegeven

### NAT Traversal
- [ ] Gesprekken werken via STUN servers
- [ ] Verbinding lukt tussen verschillende netwerken

---

## 8. TeamTalk (Voice Chat via Trystero)

### Server Aanmaken
- [ ] Server aanmaken met naam
- [ ] Uniek server-ID wordt gegenereerd (tt-xxxxx)
- [ ] Optioneel wachtwoord instellen
- [ ] Server verschijnt in Gun registry (TEAMTALK_SERVERS)

### Verbinden
- [ ] Verbinden via server-ID
- [ ] Verbinden via servernaam
- [ ] Wachtwoord-prompt bij beschermde server
- [ ] Foutmelding bij verkeerd wachtwoord
- [ ] Recente servers worden opgeslagen in localStorage

### Voice Chat
- [ ] Microfoon wordt geactiveerd bij joinen
- [ ] Audio is hoorbaar voor andere peers
- [ ] Mute/unmute toggle werkt
- [ ] Speaking indicator toont wie praat
- [ ] Per-user volume control werkt
- [ ] Microfoon instellingen (gain, noise suppression, echo cancellation)
- [ ] Mic level visualisatie werkt

### Peer Management
- [ ] Nieuwe peers verschijnen in de lijst
- [ ] Vertrekkende peers verdwijnen uit de lijst
- [ ] Late joiners ontvangen audio stream

---

## 9. Netwerk & Relay

### Relay Connectie
- [ ] Verbinding met Gun relay op Render
- [ ] Relay status indicator in systray werkt
- [ ] Data wordt persistent opgeslagen via relay

### Relay Recovery
- [ ] Health check elke 30 seconden
- [ ] Automatische reconnect wanneer relay terugkomt
- [ ] Handmatige force-reconnect via systray werkt
- [ ] Auto-reconnect instelling respecteerd (aan/uit)

### Browser Peering
- [ ] Gun WebRTC peering tussen browsers werkt
- [ ] Relay als fallback bij geen directe peering

### Superpeers
- [ ] Client wordt superpeer na 10+ minuten online
- [ ] Superpeer heartbeat elke 15 seconden
- [ ] Stale superpeers verdwijnen na 30 seconden
- [ ] Re-announce elke 60 seconden
- [ ] Superpeer toggle in instellingen werkt

---

## 10. Desktop Applicaties

### Kladblok (NotepadPane)
- [ ] Tekst invoeren en bewerken
- [ ] Auto-save naar Gun.js werkt
- [ ] Inhoud blijft bewaard na sluiten en heropenen
- [ ] Uitgeschakeld wanneer niet ingelogd

### Rekenmachine (CalculatorPane)
- [ ] Basis berekeningen: +, -, *, /
- [ ] Decimalen werken correct
- [ ] Clear/reset knop werkt

### PaneT - Paint (PaintPane)
- [ ] Tekenen op canvas werkt
- [ ] Meerdere tools beschikbaar (potlood, lijn, rechthoek, etc.)
- [ ] Kleurenpalet (24 kleuren)
- [ ] Undo/redo werkt
- [ ] Lijndikte aanpasbaar

### Media Player (MediaPane)
- [ ] Audio afspelen werkt
- [ ] Play/pause/stop knoppen
- [ ] Volume slider werkt
- [ ] Frequentie visualisatie toont animatie
- [ ] "Now Playing" integratie

### Internet Adventurer (BrowserPane)
- [ ] URL invoeren en laden (iframe)
- [ ] Bookmarks bar met retro websites
- [ ] Popup ad simulator (humor feature)
- [ ] Navigatie werkt

---

## 11. Instellingen (ControlPane)

### Uiterlijk
- [ ] Kleurenschema wijzigen (blauw, groen, zilver, etc.)
- [ ] Lettergrootte wijzigen (normaal, groot, zeer groot)
- [ ] Achtergrond/wallpaper wijzigen
- [ ] Scanlines effect toggle

### Geluid
- [ ] Systeemgeluiden aan/uit
- [ ] Toast notificaties aan/uit
- [ ] Nudge geluid aan/uit
- [ ] Typing geluid aan/uit

### Account
- [ ] Lokale naam wijzigen
- [ ] Lokale avatar wijzigen
- [ ] Wachtwoord wijzigen
- [ ] Display name wijzigen (Chatlon profiel)
- [ ] Chatlon avatar wijzigen (preset of upload)

### Netwerk
- [ ] Auto-reconnect toggle
- [ ] Superpeer toggle

### Cache
- [ ] Cache cleanup utility werkt

---

## 12. Dual Identity Model

### Lokaal Account
- [ ] localName wordt getoond in Start Menu en login tile
- [ ] localAvatar wordt getoond bij login tile en Start Menu
- [ ] Wijzigbaar via Configuratiescherm > Gebruikersaccount

### Chatlon Profiel
- [ ] displayName wordt getoond in chat en contactenlijst
- [ ] avatar wordt getoond in chat en contactenlijst
- [ ] Wijzigbaar via Chatlon Messenger > Opties
- [ ] Profiel opgeslagen in Gun (PROFILES/{email})

### Scheiding
- [ ] Lokaal account en Chatlon profiel zijn onafhankelijk
- [ ] Wijziging in een heeft geen effect op de ander

---

## 13. Data Integriteit

### Gun Data Schema
- [ ] PRESENCE/{email} wordt correct geschreven/gelezen
- [ ] PROFILES/{email} bevat avatar, displayName
- [ ] friendRequests/{email} werkt voor verzoeken
- [ ] CHAT berichten worden correct opgeslagen
- [ ] ACTIVE_TAB/{email} voorkomt dubbele sessies

### Data Compaction
- [ ] Cleanup draait bij login (5s delay)
- [ ] Verlopen signaling data wordt opgeruimd
- [ ] Stale presence data wordt verwijderd
- [ ] Oude ICE candidates worden opgeruimd

### localStorage
- [ ] chatlon_users wordt correct bijgehouden
- [ ] chatlon_credentials wordt opgeslagen/verwijderd
- [ ] chatlon_settings persisteert na refresh
- [ ] chatlon_boot_complete werkt voor sessie-tracking

---

## 14. Branding Compliance

- [ ] Geen vermelding van "Windows" (moet "Panes" zijn)
- [ ] Geen vermelding van "XP" (moet "dX" zijn)
- [ ] Geen vermelding van "Microsoft" (moet "Macrohard" zijn)
- [ ] Geen vermelding van "MSN" (moet "Chatlon" zijn)
- [ ] Geen vermelding van "Hotmail" (moet "Coldmail" zijn)
- [ ] Geen vermelding van "TeamSpeak" (moet "TeamTalk" zijn)
- [ ] Check: UI teksten, tooltips, placeholders, titels

---

## 15. Edge Cases & Stabiliteit

### Error Handling
- [ ] App crasht niet bij verloren relay verbinding
- [ ] App crasht niet bij ongeldige Gun data
- [ ] App herstelt na tijdelijke netwerk onderbreking
- [ ] Geen memory leaks bij herhaaldelijk openen/sluiten panes

### Multi-User Scenario's
- [ ] 2 gebruikers kunnen tegelijk chatten
- [ ] Presence updates zijn zichtbaar voor alle contacten
- [ ] Friend requests werken in beide richtingen
- [ ] Berichten komen aan bij correcte ontvanger

### Browser Compatibiliteit
- [ ] Chrome: alle features werken
- [ ] Firefox: alle features werken
- [ ] Edge: alle features werken

---

## Testnotities

> Gebruik deze sectie om bevindingen, bugs en opmerkingen vast te leggen.

| # | Feature | Status | Opmerking |
|---|---------|--------|-----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

---

## Samenvatting

| Categorie | Totaal | Geslaagd | Gefaald | Niet getest |
|-----------|--------|----------|---------|-------------|
| Boot & Login | 16 | | | |
| Desktop | 17 | | | |
| Window Manager | 10 | | | |
| Messenger | 16 | | | |
| 1-on-1 Chat | 17 | | | |
| Presence | 9 | | | |
| Audio Calls | 10 | | | |
| TeamTalk | 16 | | | |
| Netwerk | 12 | | | |
| Desktop Apps | 16 | | | |
| Instellingen | 15 | | | |
| Dual Identity | 8 | | | |
| Data Integriteit | 13 | | | |
| Branding | 7 | | | |
| Edge Cases | 9 | | | |
| **Totaal** | **191** | | | |
