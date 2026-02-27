# Chatlon UI Guideline - XP Authenticiteit

> Bronnen: analyse van het WinXP-project (`claude-Winxp.md` + `codex-WinXP.md`).
> Doel: referentie voor Chatlon UI-werk. Dit document is visueel/interactief, geen architectuurdocument.
> Exacte XP referentiewaarden: zie `gun-client/docs/claude-Winxp.md` sectie 15.

## Source Of Truth
- Runtime tokennamen komen uit `gun-client/src/styles/00-tokens.css`.
- Bij conflict wint altijd de tokennaam in code.

## Terminologie
- `Current token`: bestaat vandaag in `00-tokens.css` en is bindend.
- `Proposed token`: toekomstig voorstel, nog niet in productie tenzij expliciet gemarkeerd.

---

## 1. Overkoepelende principes

### 1.1 Consistente lichtlogica
Licht komt links/boven, schaduw rechts/onder.

```css
/* Raised */
box-shadow: inset -1px -1px 0 #888, inset 1px 1px 0 #fff;

/* Pressed */
box-shadow: inset 1px 1px 0 #888, inset -1px -1px 0 #fff;
```

### 1.2 Gradient discipline
Gebruik vaste stop-structuren per componenttype, niet ad hoc gradients.
- Titelbalk actief: hoger contrast/saturatie.
- Titelbalk inactief: zelfde structuur, gedempte kleurtemperatuur.
- Taakbalk/systray: eigen gradientfamilie.
- Modal content: symmetrische opbouw.

### 1.3 State fidelity
Elke interactieve control heeft minimaal:
- `normal`
- `hover`
- `pressed`
- `focused` (waar relevant)
- `inactive` (vensters)
- `disabled` (waar relevant)

Regel:
- `hover` en `pressed` moeten visueel verschillend zijn.
- `pressed` toont diepte-inversie en meestal `translate(1px, 1px)`.

### 1.4 Diepte en laaghiërarchie
Doelvolgorde:
1. Desktop
2. Vensters
3. Taakbalk
4. Menus (start/context/window)
5. Modals/overlays

---

## 2. Kleur- En Tokenbeleid

### 2.1 XP referentiekleuren (design target)
- `#0831d9`, `#0054e3`, `#3593ff`, `#003092` voor actieve Luna titlebar/frame.
- `#6582f5`, `#7697e7`, `#abbae3` voor inactieve vensterstates.
- `#1f2f86` -> `#1941a5` taakbalk band.
- `#092178` modal header/footer.
- `#3c81f3`, `#53a3ff`, `#1e52b7` taskbar-tab states.
- `#1b65cc`, `#4081ff`, `#72ade9` menu states.

### 2.2 Current tokens (bindend)
Gebruik in normatieve CSS alleen bestaande tokens uit `00-tokens.css`, bijvoorbeeld:
- `--win-frame-border`
- `--win-frame-shadow`
- `--win-titlebar-a`
- `--win-titlebar-b`
- `--win-titlebar-c`
- `--win-titlebar-d`
- `--win-titlebar-inactive-a`
- `--win-titlebar-inactive-b`
- `--taskbar-a`
- `--taskbar-b`
- `--taskbar-c`
- `--taskbar-d`
- `--tab-a`
- `--tab-b`
- `--tab-hover-a`
- `--tab-hover-b`
- `--tab-active-a`
- `--tab-active-b`
- `--menu-hover`
- `--startmenu-border`
- `--startmenu-header-a`
- `--startmenu-header-b`
- `--startmenu-item-hover`
- `--startmenu-divider`
- `--startmenu-footer-bdr`
- `--btn-border`
- `--btn-gradient-a`
- `--btn-gradient-b`
- `--input-border`

Regel:
- Geen nieuwe hardcoded UI-kleuren in component-CSS.
- Nieuwe runtime styling gebeurt via tokens + thema-overrides.

---

## 3. Typografie

Baseline:
```css
font-family: Tahoma, 'Noto Sans', sans-serif;
```

Richtwaarden:
- Venstertitel: `12px`, `700`, lichte letter spacing, text shadow op gekleurde titlebars.
- UI labels/menu/tab/button: `11px`.
- Desktop icon label: `10px` + subtiele text shadow.
- Systeemklok: `11px`.

---

## 4. Componentrichtlijnen

### 4.1 Titelbalk + frame
- Actieve en inactieve titlebars hebben elk eigen gradientset.
- Inactieve state dimt titlebar en frame samen.
- Geen enkelvoudige opacity-hack als vervanging voor inactief palette.

### 4.2 Taakbalk-tabs
- `normal`, `hover`, `active`, `pressed` afzonderlijk zichtbaar.
- Shine/highlight via pseudo-element is aanbevolen waar thema dat toelaat.

### 4.3 Menus (start/context/window)
- Consistente itemhoogte/padding over alle menuvarianten.
- Linker accentstrook en separators coherent binnen dezelfde themafamilie.
- Submenu-indicator en hover-fills consistent.

### 4.4 Modal (afmelden/afsluiten)
- Header/footer visueel gekoppeld.
- Content met symmetrische gradient en subtiele top-highlight.
- Primair knopgedrag met duidelijke hover/pressed feedback.

### 4.5 Power-transition
- Gebruik 1 centrale animatiedefinitie voor power-transities.
- Houd een korte hold-fase voor fade/desaturatie.

---

## 5. Disabled-state Richtlijn (Genuanceerd)

### 5.1 Interactieve controls
Aanbevolen:
```css
opacity: 0.7;
filter: grayscale(1);
pointer-events: none;
```

### 5.2 Niet-interactieve labels/tekst
- Geen `pointer-events` regel nodig.
- Gebruik contrastverlaging of etched look afhankelijk van thema.

Regel:
- Vermijd een universele disabled-mix op alle elementtypes.

---

## 6. Spacing en afmetingen (baseline targets)

Dit zijn baseline targets, geen absolute verplichtingen:
- Titelbalk: ~25-28px
- Taakbalk: ~30px
- Taakbalk-tab: ~22px
- Menu-item: ~25px
- Desktop icon labelzone: compact, rond 10px tekstmaat
- Systray-gebied: vergelijkbaar met taakbalkhoogte

---

## 7. UI Audit Playbook

Gebruik dit na elke grotere stylewijziging:
1. Lichtlogica blijft consistent (raised/pressed).
2. Hover en pressed zijn visueel verschillend.
3. Inactieve vensters dimmen frame + titlebar samen.
4. Menufamilie blijft metrisch uniform.
5. Klassiek en niet-klassiek thema beide gecontroleerd.
6. Geen z-index regressie tussen taskbar/menu/modal.
7. Geen onbedoelde hardcoded kleuren buiten tokenlaag.

### 7.0 Shell + Power State Auditmatrix (Baseline)

| Surface | normal | hover | pressed | active | inactive | disabled |
|---|---|---|---|---|---|---|
| `pane-header` + frame | required | n/a | n/a | required | required | n/a |
| `pane-btn` (min/max/close) | required | required | required | n/a | n/a | optional |
| `taskbar-tab` | required | required | required | required | n/a | optional |
| `start-menu` item | required | required | optional | optional | n/a | optional |
| `ctx-menu` item | required | required | optional | optional | n/a | required |
| `systray` menu item | required | required | optional | optional | n/a | optional |
| `welcome/logoff/shutdown` shells | required | n/a | n/a | required | optional | n/a |

Legend:
- `required`: moet expliciet visueel onderscheiden zijn.
- `optional`: alleen waar componentgedrag dit ondersteunt.
- `n/a`: niet van toepassing op deze surface.

### 7.2 Visuele Baseline Checkpoints (Shell + Power)
1. Pane chrome:
   - `pane-header` active/inactive contrasteert correct.
   - framekleur en titlebar dimmen samen bij inactive.
2. Taskbar tabs:
   - `normal`, `hover`, `pressed`, `active`, `unread` zijn visueel onderscheidbaar.
3. Start/context menus:
   - hover fill, separators en linker accent consistent.
   - itemhoogte/padding coherent in startmenu en contextmenu.
4. Systray:
   - menu leesbaarheid en statusweergave duidelijk in minimaal `blauw`, `klassiek`, `zune`.
5. Power flow:
   - `welcome`, `logoff`, `shutdown` volgen dezelfde visuele taal.
   - fade/transitie oogt vloeiend zonder harde sprongen.

### 7.3 Contacts State Auditmatrix (Wave A Baseline)

Bron voor operationele checklist:
- `gun-client/docs/UI_SHELL_AUDIT.md` secties `7` en `8`.

Contacts surfaces en states die verplicht auditbaar zijn:
1. `contacts-item`:
- `normal`, `hover`, `selected`, `blocked`.
2. `contacts-status-popup-item`:
- `normal`, `hover`, `active`, `disabled`.
3. `contacts-signin-input`:
- `normal`, `focus`, `error`.
4. `contacts-signin-btn`:
- `normal`, `hover`, `pressed`, `disabled`, `busy`.

Thema-check voor deze wave:
1. `blauw`
2. `klassiek`
3. `zune`

Constraint:
- Geen sign-in/presence/message logic change in deze auditpass; alleen visual/state fidelity.

### 7.4 Conversation State Auditmatrix (Wave B Baseline)

Bron voor operationele checklist:
- `gun-client/docs/UI_SHELL_AUDIT.md` secties `11` en `12`.

Conversation surfaces en states die verplicht auditbaar zijn:
1. `chat-toolbar-btn`:
- `normal`, `hover`, `pressed`, `disabled`.
2. `chat-input-text`:
- `normal`, `focus`.
3. `chat-send-btn`:
- `normal`, `hover`, `pressed`, `disabled`.
4. `chat-message`:
- `self`, `contact`, `system`, `legacy` (duidelijke visuele hiërarchie).
5. `typing-indicator`:
- `hidden`, `visible`.
6. `game-invite-bar` en wink surface:
- `normal`, `pending`, `disabled`.
7. Conversation pane shell:
- `active`, `unfocused`, `minimized` scenario check.

Thema-check voor deze wave:
1. `blauw`
2. `klassiek`
3. `zune`

Constraint:
- Geen message/invite/wink/session/presence logic change in deze auditpass; alleen visual/state fidelity.

### 7.1 Reviewer contractchecks
1. Nieuwe CSS gebruikt current tokens uit `00-tokens.css`.
2. Geen nieuwe hardcoded kleuren tenzij expliciet design-exception.
3. Nieuwe tokenvoorstellen eerst in `10B Proposed Tokens` met mapping + status.
4. State-audits blijven verplicht per wave:
- Shell + Power: `UI_SHELL_AUDIT.md` secties `1` t/m `6`
- Contacts: `UI_SHELL_AUDIT.md` secties `7` t/m `10`
- Conversation: `UI_SHELL_AUDIT.md` secties `11` t/m `14`
- Apps: `UI_SHELL_AUDIT.md` secties `15` t/m `19`

---

## 8. Anti-patronen
- Willekeurige gradients zonder componentstructuur.
- Pressed-state alleen donkerder maken zonder diepteverschuiving.
- Inactief venster alleen via opacity.
- Ruwe separators (`border-top`) waar zachte divider verwacht wordt.
- Nieuwe componentkleuren hardcoded buiten tokens.

---

## 9. Besluit
Deze guideline bewaakt twee zaken tegelijk:
- XP-authenticiteit in details.
- Onderhoudbare, token-gedreven implementatie in Chatlon.

---

## 10. Token-Naar-Element Mapping En Uitbreidingsplan

### 10A. Existing Tokens (in production)

| Token | Element | CSS-eigenschap |
|---|---|---|
| `--win-bg` | vensterinhoud achtergrond | `background-color` |
| `--win-frame-border` | vensterrand | `border-color` |
| `--win-frame-shadow` | buitenste ring venster | `box-shadow` |
| `--win-titlebar-a/b/c/d` | actieve titlebar stops | `background` gradient |
| `--win-titlebar-inactive-a/b` | inactieve titlebar stops | `background` gradient |
| `--win-content-border` | vensterinhoud rand | `border-color` |
| `--win-btn-bg` | pane header button bg | `background` |
| `--taskbar-a/b/c/d` | taakbalk stops | `background` gradient |
| `--tab-a/b` | tab normaal | `background` gradient |
| `--tab-hover-a/b` | tab hover | `background` gradient |
| `--tab-active-a/b` | tab actief | `background` gradient |
| `--tab-notify-a/b` | tab notify | `background` gradient |
| `--startbtn-a/b` | startknop | `background` gradient |
| `--startbtn-border` | startknop rand | `border-color` |
| `--startmenu-*` | startmenu delen | `background`/`border`/`color` |
| `--menu-hover` | menu hover bg | `background-color` |
| `--toolbar-bg` / `--toolbar-border` | toolbars | `background-color` / `border-color` |
| `--btn-border` / `--btn-gradient-a/b` | buttons | `border` / `background` |
| `--input-border` | inputs | `border-color` |
| `--link-color` / `--link-color-light` | links | `color` |
| `--text-muted` / `--text-disabled` | tekststates | `color` |

### 10A.1 Hardcoded waarden die nog getokeniseerd moeten worden

| Locatie (bestand:klasse) | Hardcoded waarde | Voorgestelde current->proposed |
|---|---|---|
| `02-shell.css` `.ctx-menu-item:hover` | `background: #0a246a` | `--ctx-menu-hover-bg` (additief beschikbaar) |
| `02-shell.css` `.ctx-menu-item:hover` | `color: #fff` | `--ctx-menu-hover-fg` (additief beschikbaar) |
| `02-shell.css` `.ctx-menu` | `border-color: #ffffff #808080 #808080 #ffffff` | `--ctx-menu-border-light` / `--ctx-menu-border-dark` (additief beschikbaar) |
| `02-shell.css` `.ctx-menu-separator` | `border-top: 1px solid #808080` | `--ctx-menu-sep-dark` (additief beschikbaar) |
| `02-shell.css` `.ctx-menu-separator` | `border-bottom: 1px solid #ffffff` | `--ctx-menu-sep-light` (additief beschikbaar) |
| `02-shell.css` `.systray-menu` | `border: 1px solid #808080` | `--ctx-menu-border-dark` / `--systray-border-left` (additief beschikbaar) |
| `08-utilities-overrides.css` `.pane-btn--close` | `background: #e81123` | `--pane-btn-close-bg` |
| `02-shell.css` `.start-menu-header` | `border-bottom: 2px solid #F9B14D` | `--startmenu-accent-line` (additief beschikbaar) |

### 10B. Proposed Tokens (future)

Statusregel:
- Naamgevingscontract in deze sectie blijft `proposed`.
- Een subset is al additief beschikbaar in `00-tokens.css` als voorbereidende runtime aliases.
- Bindend voor implementatie blijft sectie `10A` (current tokens).

#### 10B.1 Mapping current -> proposed canonical

| Current token | Proposed canonical token | Reden | Status |
|---|---|---|---|
| `--win-frame-border` | `--win-frame-active` | Actieve state explicieter | proposed |
| `--taskbar-a` | `--win-taskbar-a` | Prefix-uniformiteit | proposed |
| `--taskbar-b` | `--win-taskbar-b` | Prefix-uniformiteit | proposed |
| `--menu-hover` | `--win-menu-hover-bg` | Semantisch specifieker | proposed |
| `--startmenu-item-hover` | `--win-menu-left-accent` (aanvullend) | Hover en accent loskoppelen | proposed |
| `--win-btn-bg` | `--pane-btn-hover-bg` (aanvullend) | Pane button states expliciet | proposed |

#### 10B.2 Nieuwe tokens voor aankomende verbeteringen

> Tokens gemarkeerd met ✅ zijn al toegevoegd aan `00-tokens.css`. Tokens zonder markering zijn nog niet geïmplementeerd.

**Systray** ✅ (al in 00-tokens.css als aliases op taskbar/menu-hover)
- `--systray-bg`, `--systray-border-left`, `--systray-text`, `--systray-icon-hover`

**Context menu** ✅ (al in 00-tokens.css)
- `--ctx-menu-hover-bg`, `--ctx-menu-hover-fg`, `--ctx-menu-border-light`, `--ctx-menu-border-dark`, `--ctx-menu-sep-dark`, `--ctx-menu-sep-light`

**Startmenu accent** ✅ (al in 00-tokens.css)
- `--startmenu-accent-line`

---

**Titelbalk-gradiënt uitbreiding** — 2 extra stops (huidige 4-stop → 6-stop)

Gradient-structuur na uitbreiding:
```css
background: linear-gradient(to bottom,
  var(--win-titlebar-a)  0%,
  var(--win-titlebar-b)  9%,
  var(--win-titlebar-c) 18%,
  var(--win-titlebar-e) 55%,   /* NIEUW */
  var(--win-titlebar-f) 85%,   /* NIEUW */
  var(--win-titlebar-d) 100%
);
```

| Token | Luna blauw | Zilver | Olijfgroen | Royale | Zune | Royale Noir | Energy Blue | Klassiek |
|---|---|---|---|---|---|---|---|---|
| `--win-titlebar-e` (55%) | `#0058e6` | `#5E7CA0` | `#5B7526` | `#1C3E7A` | `#3A3A3A` | `#1A1A2E` | `#0068D2` | — |
| `--win-titlebar-f` (85%) | `#0046d0` | `#4E6A90` | `#4A6318` | `#162E6A` | `#2A2A2A` | `#111128` | `#0058C0` | — |

---

**Taakbalk-gradiënt uitbreiding** — extra midstop + topshine

| Token | Luna blauw | Zilver | Olijfgroen | Royale | Zune | Royale Noir | Energy Blue |
|---|---|---|---|---|---|---|---|
| `--taskbar-e` (55%) | `#245edb` | `#7C8EA4` | `#6D7128` | `#13306A` | `#2C2C2C` | `#141422` | `#0060C8` |
| `--taskbar-highlight` | `rgba(255,255,255,0.35)` | `rgba(255,255,255,0.30)` | `rgba(255,255,255,0.25)` | `rgba(255,255,255,0.20)` | `rgba(255,255,255,0.15)` | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.30)` |

---

**Titelbalk-knoppen (pane-btn)**

| Token | Luna blauw | Zilver | Olijfgroen | Royale | Zune | Royale Noir | Energy Blue | Klassiek |
|---|---|---|---|---|---|---|---|---|
| `--pane-btn-close-bg` | `#E81123` | `#E81123` | `#E81123` | `#CC1020` | `#C81020` | `#B81020` | `#E81123` | `#C0C0C0` |
| `--pane-btn-hover-bg` | `#6BAEFC` | `#B8CCD8` | `#A4BC70` | `#5898C8` | `#6A6A6A` | `#3E4E7E` | `#52C0F8` | — (bevel) |
| `--pane-btn-close-hover` | `#FF3344` | `#FF3344` | `#FF3344` | `#EE2030` | `#E02030` | `#D02030` | `#FF3344` | — (bevel) |

---

**Modal/power tokens**

| Token | Luna blauw | Zilver | Olijfgroen | Royale | Zune | Royale Noir | Energy Blue | Klassiek |
|---|---|---|---|---|---|---|---|---|
| `--modal-header-bg-a` | `#3A6FCF` | `#7090B8` | `#6E8838` | `#2858A8` | `#5A5A5A` | `#243060` | `#2888E8` | `#000080` |
| `--modal-header-bg-b` | `#092178` | `#3C5480` | `#3A4E10` | `#0C2060` | `#1A1A1A` | `#0A0A20` | `#003888` | `#1084D0` |
| `--modal-content-a` | `#F4F2EA` | `#EEEDF0` | `#F0EDE0` | `#EEEAE0` | `#ECE8E4` | `#E4E2DA` | `#F0ECDC` | `#D4D0C8` |
| `--modal-content-b` | `#FFFFFF` | `#FAFAFE` | `#FAFAF4` | `#FAFAF8` | `#F8F4F0` | `#F2F0E8` | `#F8F8F0` | `#FFFFFF` |
| `--modal-border` | `#245EDC` | `#5E7CA0` | `#6E7B38` | `#1C3E7A` | `#3A3A3A` | `#1A1A2E` | `#0068D2` | `#808080` |

Alle bovenstaande entries zonder ✅: `status = not implemented`.

#### 10B.3 Implementatievolgorde (aanbevolen)
1. Hardcoded waarden uit 10A.1 tokeniseren.
2. Systray tokens invoeren.
3. Context-menu tokens invoeren.
4. Pane button tokens invoeren.
5. Titlebar/taskbar extra gradient stops invoeren.
6. Modal/power tokens invoeren.
