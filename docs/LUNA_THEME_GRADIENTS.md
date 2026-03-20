# Luna Theme Gradients

Deze file bundelt de huidige gradientreferenties voor de XP/Luna shellthemes in `gun-client`.
Gebruik hem als werkdocument voor CSS die uit je screenshot-analysetool komt.

## Bronnen

- Runtime tokens: `gun-client/src/styles/00-tokens.css`
- Caption button toepassing: `gun-client/src/styles/02-shell.css`
- Hard-line component overrides: `gun-client/src/styles/08-utilities-overrides.css`
- Oudere notities zonder extensie: `gun-client/docs/luna-gradients` en `gun-client/docs/luna-gradient-codex`

## Werkwijze

1. Maak een screenshot per component/state in je XP-VM.
2. Laat de analyzer raw CSS genereren.
3. Plak de raw output onder de juiste themasectie.
4. Voor `blauw`, `olijfgroen` en `zilver`: bewaar de captures hier als hardcoded referentie.
5. Alleen voor `luna-custom`: map de output daarna naar seed-driven tokens in `00-tokens.css`.
6. Verander de stopstructuur alleen als de capture dat echt rechtvaardigt.

## Theme families

| Familie | Theme ids | Runtime model |
| --- | --- | --- |
| Default Luna Blue | `blauw` via `:root` | Hardcoded runtime vars + raw captures |
| Luna Custom | `luna-custom` | Volledige XP stopmap op basis van `--custom-luna-seed` |
| Authentieke Luna varianten | `olijfgroen`, `zilver` | Hardcoded theme vars + raw captures |
| Hard-line XP varianten | `royale`, `zune`, `royale-noir`, `energy-blue` | Theme vars + expliciete component-overrides met harde 49/50-split |

## Default Luna Blue

Dit is de standaard `:root` set die overeenkomt met de `blauw` optie in de UI.
Voor deze theme houden we de captures hardcoded bij.
De seed-driven XP-map hoort alleen bij `luna-custom`.

### Relevante input tokens

```css
:root {
  --win-titlebar-a: #0058E6;
  --win-titlebar-b: #2596F3;
  --win-titlebar-c: #0058E6;
  --win-titlebar-d: #0046AD;
  --win-titlebar-inactive-a: #82A2D4;
  --win-titlebar-inactive-b: #A5C4E0;
  --xp-titlebar-edge-active: #0046AD;
  --xp-titlebar-edge-inactive: #6882AA;
  --win-btn-bg: #3F8CF3;
  --taskbar-a: #245EDB;
  --taskbar-b: #3F8CF3;
  --taskbar-c: #245EDB;
  --taskbar-d: #1941A5;
  --systray-bg: var(--taskbar-c);
  --systray-border-left: var(--win-frame-shadow);
  --startmenu-header-a: #5199F8;
  --startmenu-header-b: #245EDC;
}
```

### Huidige runtime gradients

```css
:root {
  --xp-titlebar-gradient: linear-gradient(to bottom, var(--win-titlebar-a) 0%, var(--win-titlebar-b) 9%, var(--win-titlebar-c) 18%, var(--win-titlebar-c) 92%, var(--xp-titlebar-edge-active) 100%);
  --xp-titlebar-inactive-gradient: linear-gradient(to bottom, var(--win-titlebar-inactive-a) 0%, var(--win-titlebar-inactive-b) 9%, var(--win-titlebar-inactive-a) 18%, var(--win-titlebar-inactive-a) 92%, var(--xp-titlebar-edge-inactive) 100%);
  --xp-caption-btn-min-gradient: linear-gradient(to bottom, color-mix(in srgb, var(--win-btn-bg) 60%, white) 0%, var(--win-btn-bg) 100%);
  --xp-caption-btn-max-gradient: linear-gradient(to bottom, color-mix(in srgb, var(--win-btn-bg) 60%, white) 0%, var(--win-btn-bg) 100%);
  --xp-caption-btn-close-gradient: linear-gradient(to bottom, color-mix(in srgb, var(--pane-btn-close-bg, #e81123) 60%, white) 0%, var(--pane-btn-close-bg, #e81123) 100%);
  --xp-taskbar-gradient: linear-gradient(to bottom, var(--taskbar-a) 0%, var(--taskbar-b) 9%, var(--taskbar-c) 18%, var(--taskbar-c) 92%, var(--taskbar-d) 100%);
  --xp-systray-gradient: linear-gradient(to bottom, color-mix(in srgb, var(--systray-bg) 84%, white) 0%, var(--systray-bg) 100%);
  --xp-start-menu-header-gradient: linear-gradient(to bottom, var(--startmenu-header-a) 0%, var(--startmenu-header-b) 100%);
  --xp-start-menu-footer-gradient: linear-gradient(to bottom, var(--startmenu-header-a) 0%, var(--startmenu-header-b) 100%);
}
```

### Measurement Checklist

Gebruik deze lijst als actieve Luna Blue meetmatrix.
Na elke nieuwe capture werken we deze status bij en noem ik de resterende open items.

- [x] Active titlebar
- [x] Inactive titlebar
- [x] Caption buttons: volgt de WinXP-referentie, geen aparte meting meer voorzien
- [x] Taskbar shell
- [x] Taskbar item inactive
- [x] Taskbar item active
- [x] Taskbar item inactive hover
- [x] Taskbar item active hover
- [x] Systray shell
- [x] Start button normal
- [x] Start button hover
- [x] Start button pressed
- [x] Start button border: bewust weggelaten
- [x] Start menu header
- [x] Start menu footer
- [x] Start menu header border
- [x] Start menu right col
- [x] Start menu item hover
- [x] Start menu border
- [x] Start menu divider between left and right col
- [x] Start menu footer border
- [x] Start menu left-col pinned divider
- [x] Start menu right-col pinned divider top
- [x] Start menu right-col pinned divider bottom
- [x] Start menu accent line
- [x] Context menu background
- [x] Context menu item hover
- [x] Context menu border: single border in VM
- [x] Context menu divider
- [x] Frame border active reference
- [x] Frame border active chosen solid
- [x] Frame border inactive reference
- [x] Frame border inactive chosen solid
- [x] Window content border: not theme-specific, outside Luna measurement scope
- [x] Active titlebar fade left: overnemen van `luna-custom`
- [x] Active titlebar fade right: overnemen van `luna-custom`
- [x] Inactive titlebar fade left: overnemen van `luna-custom`
- [x] Inactive titlebar fade right: overnemen van `luna-custom`
- [x] Systray divider dark
- [x] Systray divider highlight/light
- [x] Systray menu border: gelijk aan context menu border
- [x] Systray menu separator dark: gelijk aan context menu divider
- [x] Systray menu separator light: geen aparte meting, zelfde separatorbehandeling als context menu
- [x] Taskbar unread/notify
- [x] Systray icon hover fill: bestaat niet in Windows XP, geen apart verschil

### Family rollout follow-up

Voor de volledige implementatie van `blauw`, `olijfgroen` en `zilver` ontbreken nog deze expliciete Luna-metingen of keuzes:

- [ ] Frame border active: `olijfgroen`
- [ ] Frame border inactive: `olijfgroen`
- [ ] Frame border active: `zilver`
- [ ] Frame border inactive: `zilver`
- [ ] Systray divider dark/left: `olijfgroen`
- [ ] Systray divider light/right: `olijfgroen`
- [ ] Systray divider dark/left: `zilver`
- [ ] Systray divider light/right: `zilver`
- [ ] Taskbar item hover: family-wide capture of expliciete afspraak per theme

### Raw analyzer slot

```css
/* active titlebar */
linear-gradient(
  180deg,
  #0058EE 0.0%,
  #3E96FF 1.9%,
  #0371FE 9.2%,
  #0054E3 23.8%,
  #005AF4 62.1%,
  #026AFE 74.9%,
  #0061FC 91.3%,
  #0044D2 100.0%
)
/* inactive titlebar */
linear-gradient(
  180deg,
  #688DE0 0.0%,
  #9CB8EA 5.9%,
  #7A96E0 42.1%,
  #82A9E9 78.5%,
  #7A93DF 100.0%
)
/* caption buttons */
/* taskbar */
linear-gradient(
  180deg,
  #3F72D6 0.0%,
  #3786E7 1.9%,
  #4892E6 5.3%,
  #2157D7 32.9%,
  #2663E0 81.4%,
  #2158D4 91.7%,
  #1941A5 100.0%
)
/* systray */
linear-gradient(
  180deg,
  #0E7ED9 0.0%,
  #18B8F2 5.0%,
  #0E8DEA 43.1%,
  #0D93ED 67.5%,
  #10A0EC 86.5%,
  #095BC9 100.0%
)
/* systray divider dark/left */
#174596
/* systray divider light/right */
#1BC4F3
/* start menu header */
linear-gradient(
  180deg,
  #225CC5 0.0%,
  #70A8E7 2.7%,
  #0C5FCB 16.1%,
  #4792EC 97.5%,
  #1D6DD2 100.0%
)
/* start menu footer */
linear-gradient(
  180deg,
  #1D6ACE 0.0%,
  #438BE3 3.4%,
  #1F72DE 57.3%,
  #1B5DC8 100.0%
)
/* start menu right col */
#D3E5FA
/* start menu item hover */
#316AC5
/* start menu divider between left and right col */
#A9C9F1
/* start menu header border */
#1D6BD0
/* start menu border */
#1854C2
/* start menu footer border */
#3B7CD4
/* start menu left-col pinned divider */
#DEDED5
/* start menu right-col pinned divider top */
#89BAFE
/* start menu right-col pinned divider bottom */
#E0E9F3
/* start menu accent line */
#F98A24
/* start menu divider note */
/* there are 3 distinct dividers: center column divider, left-col pinned divider, and right-col two-tone pinned divider with top/bottom colors */
/* context menu item hover */
#316AC5
/* context menu background */
#FFFFFF
/* context menu border */
#BDBAAE
/* context menu divider */
#B3AFA2
/* context menu note */
/* in the VM this reads as a single border, not separate light/dark border layers */
/* systray menu border */
/* same as context menu border */
#BDBAAE
/* systray menu separator */
/* same as context menu divider */
#B3AFA2
/* frame border inactive gradient reference */
linear-gradient(
  90deg,
  #626FD1 0.0%,
  #91A3E3 100.0%
)
/* frame border inactive chosen solid */
#5160DF
/* frame border inactive measured rails */
/* top uses the titlebar itself */
/* left */
#758CDC
/* bottom */
#7383DA
/* right */
#7383DA
/* frame border inactive chosen frame base */
#7A94DA
/* frame border active gradient reference */
linear-gradient(
  90deg,
  #011ED1 0.0%,
  #2368E0 100.0%
)
/* frame border active chosen solid */
#0831D9
/* frame border active measured rails */
/* top uses the titlebar itself */
/* left */
#135EE9
/* bottom */
#001A9A
/* right */
#001DA0
/* frame border active rail note */
/* right rail continues all the way to the top and overlaps the titlebar edge */
/* frame shell implementation note */
/* prefer separate wrapper layers + titlebar cap, not a CSS gradient border */
/* taskbar item inactive */
linear-gradient(
  180deg,
  #488FF6 0.0%,
  #387FF4 100.0%
)
/* taskbar item inactive hover */
linear-gradient(
  180deg,
  #75AAED 0.0%,
  #80B9FF 1.8%,
  #55A3FF 23.5%,
  #3186FF 94.8%,
  #256CDD 100.0%
)
/* taskbar item active */
linear-gradient(
  180deg,
  #1850B6 0.0%,
  #2156B7 94.1%,
  #1A4DB4 100.0%
)
/* taskbar item active hover */
linear-gradient(
  180deg,
  #2F6DE7 0.0%,
  #306FE5 100.0%
)
/* taskbar unread/notify */
linear-gradient(
  180deg,
  #CD7509 0.0%,
  #F8A62E 3.4%,
  #E17806 49.4%,
  #99540F 100.0%
)
/* taskbar item state logic note */
/* 5 states: active, active hover, inactive, inactive hover, notify */
/* no pressed state: mousedown on active or inactive reads as active */
/* on mouseup while still hovered, return to the relevant hover state */
/* clicking an active taskbar item removes focus from the pane; the pane stays open but becomes inactive */
/* start button normal */
linear-gradient(
  180deg,
  #3B883B 0.0%,
  #4B994B 0.7%,
  #6DAF6C 5.5%,
  #3C973B 22.1%,
  #45AB45 60.0%,
  #37823A 93.2%,
  #317445 100.0%
)
/* start button hover */
linear-gradient(
  180deg,
  #229124 0.0%,
  #72C273 6.9%,
  #3EAC3E 23.3%,
  #49BF49 60.8%,
  #338635 100.0%
)
/* start button pressed */
linear-gradient(
  180deg,
  #092C09 0.0%,
  #255125 2.6%,
  #2F652F 5.0%,
  #2E802E 9.8%,
  #229122 49.0%,
  #278127 93.0%,
  #1A5F1B 100.0%
)
```

### Caption button model hypothesis

Deze hypothese was nuttig om de glanslagen te begrijpen, maar is niet de gekozen eindrichting.

Ja: die witte overlay kan tegelijk een zachte binnenvorm en een aparte hotspot zijn.
Voor Luna Blue leest dat geloofwaardiger als een gestapelde glanslaag dan als een enkele lineaire gradient.

Werkmodel:

- basisvlak met vrij vlak blauw midden
- witte buitenrand
- donkerblauwe inset rim aan onder/rechts
- een grotere afgeronde rechthoekige sheen over bijna het hele binnenvlak
- een extra kleine hotspot linksboven

```css
.pane-btn--minimize,
.pane-btn--maximize {
  position: relative;
  background-color: #6F98F8;
  background-image:
    radial-gradient(
      circle at 28% 22%,
      rgba(255,255,255,0.95) 0%,
      rgba(255,255,255,0.58) 12%,
      rgba(255,255,255,0.18) 24%,
      rgba(255,255,255,0) 38%
    ),
    linear-gradient(
      180deg,
      rgba(255,255,255,0.42) 0%,
      rgba(255,255,255,0.18) 18%,
      rgba(255,255,255,0.08) 40%,
      rgba(255,255,255,0.02) 58%,
      rgba(255,255,255,0) 100%
    );
  border: 1px solid #FFFFFF;
  border-radius: 3px;
  box-shadow:
    inset 0 -1px 2px 1px #1563ED,
    inset 0 1px 0 rgba(255,255,255,0.38),
    inset 1px 0 0 rgba(255,255,255,0.16),
    inset -1px 0 0 rgba(0,58,199,0.28);
}

.pane-btn--minimize::after,
.pane-btn--maximize::after {
  content: "";
  position: absolute;
  inset: 1px 2px 4px 1px;
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.34) 0%,
    rgba(255,255,255,0.16) 26%,
    rgba(255,255,255,0.05) 55%,
    rgba(255,255,255,0) 100%
  );
  pointer-events: none;
}
```

Praktische lezing:

- De `::after` laag vormt de bijna-vierkante witte sheen die je over het hele knopvlak ziet.
- De eerste `radial-gradient(...)` in `background-image` vormt de fellere hotspot linksboven.
- Samen geven die twee lagen het "gel" of "bubble" effect zonder een geforceerde full-face gradientfit.

### Accepted Luna Blue caption button implementation

Deze variant is de werkende keuze voor de Luna Blue test. De directe XP-port uit `WinXP/winXP/src/WinXP/Windows/HeaderButtons.js` sloot visueel beter aan dan de handmatig gereconstrueerde rim/highlight-modellen.

Belangrijk:

- alleen toegepast op `blauw` via `.desktop:not([data-theme])`
- vaste knopmaat van `22x22`
- echte witte border
- radiale XP-fill
- glyphs getekend met pseudo-elements in plaats van alleen tekst
- voor restore/maximized is een aparte `pane-btn--maximized` class nodig in `Pane.js`

```css
.desktop:not([data-theme]) .pane-btn--minimize,
.desktop:not([data-theme]) .pane-btn--maximize,
.desktop:not([data-theme]) .pane-btn--maximized {
  position: relative;
  width: 22px;
  height: 22px;
  overflow: hidden;
  color: transparent;
  font-size: 0;
  border-color: #FFFFFF;
  box-shadow: inset 0 -1px 2px 1px #4646FF;
  background-image: radial-gradient(
    circle at 90% 90%,
    #0054E9 0%,
    #2263D5 55%,
    #4479E4 70%,
    #A3BBEC 90%,
    #FFFFFF 100%
  );
}

.desktop:not([data-theme]) .pane-btn--minimize::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 13px;
  width: 8px;
  height: 3px;
  background-color: #FFFFFF;
  pointer-events: none;
}

.desktop:not([data-theme]) .pane-btn--maximize::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 4px;
  width: 12px;
  height: 12px;
  box-shadow: inset 0 3px #FFFFFF, inset 0 0 0 1px #FFFFFF;
  pointer-events: none;
}

.desktop:not([data-theme]) .pane-btn--maximized::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 4px;
  width: 8px;
  height: 8px;
  box-shadow: inset 0 2px #FFFFFF, inset 0 0 0 1px #FFFFFF;
  pointer-events: none;
}

.desktop:not([data-theme]) .pane-btn--maximized::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 7px;
  width: 8px;
  height: 8px;
  background-color: #136DFF;
  box-shadow: inset 0 2px #FFFFFF, inset 0 0 0 1px #FFFFFF, 1px -1px #136DFF;
  pointer-events: none;
}
```

## Luna Custom

`luna-custom` is op dit moment de meest gedetailleerde XP/Luna implementatie in de repo.
Deze variant volgt de uitgebreide WinXP stopmap en laat alle kleuren afleiden uit `--custom-luna-seed`.

### Huidige runtime gradients

```css
[data-theme="luna-custom"] {
  --luna-seed: var(--custom-luna-seed, #0057E5);
  --xp-titlebar-gradient: linear-gradient(to bottom, color-mix(in oklch, var(--luna-seed) 98%, white) 0%, color-mix(in oklch, var(--luna-seed) 70%, white) 4%, color-mix(in oklch, var(--luna-seed) 75%, white) 6%, color-mix(in oklch, var(--luna-seed) 84%, white) 8%, color-mix(in oklch, var(--luna-seed) 90%, white) 10%, color-mix(in oklch, var(--luna-seed) 94%, white) 14%, color-mix(in oklch, var(--luna-seed) 98%, white) 20%, color-mix(in oklch, var(--luna-seed) 99%, white) 24%, var(--luna-seed) 56%, color-mix(in oklch, var(--luna-seed) 96%, white) 66%, color-mix(in oklch, var(--luna-seed) 90%, white) 76%, color-mix(in oklch, var(--luna-seed) 94%, white) 86%, color-mix(in oklch, var(--luna-seed) 96%, black) 92%, color-mix(in oklch, var(--luna-seed) 80%, black) 94%, color-mix(in oklch, var(--luna-seed) 65%, black) 100%);
  --xp-titlebar-inactive-gradient: linear-gradient(to bottom, color-mix(in oklch, var(--luna-seed) 56%, white) 0%, color-mix(in oklch, var(--luna-seed) 54%, white) 3%, color-mix(in oklch, var(--luna-seed) 49%, white) 6%, color-mix(in oklch, var(--luna-seed) 47%, white) 8%, color-mix(in oklch, var(--luna-seed) 52%, white) 14%, color-mix(in oklch, var(--luna-seed) 54%, white) 17%, color-mix(in oklch, var(--luna-seed) 56%, white) 25%, color-mix(in oklch, var(--luna-seed) 55%, white) 56%, color-mix(in oklch, var(--luna-seed) 51%, white) 81%, color-mix(in oklch, var(--luna-seed) 52%, white) 89%, color-mix(in oklch, var(--luna-seed) 56%, white) 94%, color-mix(in oklch, var(--luna-seed) 57%, white) 97%, color-mix(in oklch, var(--luna-seed) 57%, white) 100%);
  --xp-titlebar-fade-left: linear-gradient(to right, color-mix(in oklch, var(--luna-seed) 90%, black) 0%, transparent 100%);
  --xp-titlebar-fade-right: linear-gradient(to left, color-mix(in oklch, var(--luna-seed) 90%, black) 0%, transparent 100%);
  --xp-caption-btn-min-gradient: radial-gradient(circle at 90% 90%, color-mix(in oklch, var(--luna-seed) 99%, white) 0%, color-mix(in oklch, var(--luna-seed) 88%, black) 55%, color-mix(in oklch, var(--luna-seed) 75%, white) 70%, color-mix(in oklch, var(--luna-seed) 36%, white) 90%, #FFFFFF 100%);
  --xp-caption-btn-max-gradient: radial-gradient(circle at 90% 90%, color-mix(in oklch, var(--luna-seed) 99%, white) 0%, color-mix(in oklch, var(--luna-seed) 88%, black) 55%, color-mix(in oklch, var(--luna-seed) 75%, white) 70%, color-mix(in oklch, var(--luna-seed) 36%, white) 90%, #FFFFFF 100%);
  --xp-caption-btn-close-gradient: radial-gradient(circle at 90% 90%, #CC4600 0%, color-mix(in oklch, #CC4600 82%, white) 55%, color-mix(in oklch, #CC4600 68%, white) 70%, color-mix(in oklch, #CC4600 34%, white) 90%, #FFFFFF 100%);
  --xp-taskbar-gradient: linear-gradient(to bottom, color-mix(in oklch, var(--luna-seed) 55%, black) 0%, color-mix(in oklch, var(--luna-seed) 82%, black) 3%, color-mix(in oklch, var(--luna-seed) 95%, white) 6%, color-mix(in oklch, var(--luna-seed) 88%, white) 10%, color-mix(in oklch, var(--luna-seed) 90%, white) 12%, color-mix(in oklch, var(--luna-seed) 97%, white) 15%, color-mix(in oklch, var(--luna-seed) 93%, black) 18%, color-mix(in oklch, var(--luna-seed) 90%, black) 20%, color-mix(in oklch, var(--luna-seed) 89%, black) 23%, color-mix(in oklch, var(--luna-seed) 89%, black) 38%, color-mix(in oklch, var(--luna-seed) 91%, black) 54%, color-mix(in oklch, var(--luna-seed) 92%, black) 86%, color-mix(in oklch, var(--luna-seed) 91%, black) 89%, color-mix(in oklch, var(--luna-seed) 89%, black) 92%, color-mix(in oklch, var(--luna-seed) 78%, black) 95%, color-mix(in oklch, var(--luna-seed) 68%, black) 98%);
  --xp-systray-gradient: linear-gradient(to bottom, color-mix(in oklch, var(--luna-seed) 76%, black) 1%, color-mix(in oklch, var(--luna-seed) 80%, white) 6%, color-mix(in oklch, var(--luna-seed) 70%, white) 10%, color-mix(in oklch, var(--luna-seed) 78%, white) 14%, color-mix(in oklch, var(--luna-seed) 82%, white) 19%, color-mix(in oklch, var(--luna-seed) 85%, white) 63%, color-mix(in oklch, var(--luna-seed) 76%, white) 81%, color-mix(in oklch, var(--luna-seed) 77%, white) 88%, color-mix(in oklch, var(--luna-seed) 79%, white) 91%, color-mix(in oklch, var(--luna-seed) 83%, white) 94%, color-mix(in oklch, var(--luna-seed) 88%, black) 97%, color-mix(in oklch, var(--luna-seed) 78%, black) 100%);
  --xp-start-menu-header-gradient: linear-gradient(to bottom, color-mix(in oklch, var(--luna-seed) 84%, black) 0%, color-mix(in oklch, var(--luna-seed) 80%, black) 12%, color-mix(in oklch, var(--luna-seed) 80%, black) 20%, color-mix(in oklch, var(--luna-seed) 82%, black) 32%, color-mix(in oklch, var(--luna-seed) 83%, black) 33%, color-mix(in oklch, var(--luna-seed) 85%, black) 47%, color-mix(in oklch, var(--luna-seed) 87%, black) 54%, color-mix(in oklch, var(--luna-seed) 90%, black) 60%, color-mix(in oklch, var(--luna-seed) 92%, black) 65%, color-mix(in oklch, var(--luna-seed) 95%, white) 77%, color-mix(in oklch, var(--luna-seed) 96%, white) 79%, color-mix(in oklch, var(--luna-seed) 90%, white) 90%, color-mix(in oklch, var(--luna-seed) 88%, white) 100%);
  --xp-start-menu-footer-gradient: linear-gradient(to bottom, color-mix(in oklch, var(--luna-seed) 86%, white) 0%, color-mix(in oklch, var(--luna-seed) 94%, white) 3%, color-mix(in oklch, var(--luna-seed) 91%, white) 5%, color-mix(in oklch, var(--luna-seed) 91%, white) 17%, color-mix(in oklch, var(--luna-seed) 93%, white) 21%, color-mix(in oklch, var(--luna-seed) 95%, white) 26%, color-mix(in oklch, var(--luna-seed) 95%, white) 29%, color-mix(in oklch, var(--luna-seed) 97%, white) 39%, color-mix(in oklch, var(--luna-seed) 96%, black) 49%, color-mix(in oklch, var(--luna-seed) 94%, black) 57%, color-mix(in oklch, var(--luna-seed) 91%, black) 62%, color-mix(in oklch, var(--luna-seed) 90%, black) 72%, color-mix(in oklch, var(--luna-seed) 88%, black) 75%, color-mix(in oklch, var(--luna-seed) 86%, black) 83%, color-mix(in oklch, var(--luna-seed) 82%, black) 88%);
}
```

### Raw analyzer slot

```css
/* seed: #0057E5 of custom sample */
/* active titlebar */
/* inactive titlebar */
/* titlebar fades left/right */
/* caption buttons: min/max/close */
/* taskbar */
/* systray */
/* start menu header */
/* start menu footer */
```

## Authentieke Luna varianten

Deze familie gebruikt gedeelde gradientformules en per-theme kleurinputs.
De close button erft hier nog de generieke `:root` close-gradient.

### Gedeelde gradientformules

```css
[data-theme="olijfgroen"],
[data-theme="zilver"] {
  --xp-titlebar-gradient: linear-gradient(to bottom, var(--win-titlebar-a) 0%, var(--win-titlebar-b) 9%, var(--win-titlebar-c) 18%, var(--win-titlebar-c) 92%, var(--xp-titlebar-edge-active) 100%);
  --xp-titlebar-inactive-gradient: linear-gradient(to bottom, var(--win-titlebar-inactive-a) 0%, var(--win-titlebar-inactive-b) 9%, var(--win-titlebar-inactive-a) 18%, var(--win-titlebar-inactive-a) 92%, var(--xp-titlebar-edge-inactive) 100%);
  --xp-caption-btn-min-gradient: linear-gradient(to bottom, color-mix(in srgb, var(--win-btn-bg) 60%, white) 0%, var(--win-btn-bg) 100%);
  --xp-caption-btn-max-gradient: linear-gradient(to bottom, color-mix(in srgb, var(--win-btn-bg) 60%, white) 0%, var(--win-btn-bg) 100%);
  --xp-taskbar-gradient: linear-gradient(to bottom, var(--taskbar-a) 0%, var(--taskbar-b) 9%, var(--taskbar-c) 18%, var(--taskbar-c) 92%, var(--taskbar-d) 100%);
  --xp-systray-gradient: linear-gradient(to bottom, color-mix(in srgb, var(--systray-bg) 84%, white) 0%, var(--systray-bg) 100%);
  --xp-start-menu-header-gradient: linear-gradient(to bottom, var(--startmenu-header-a) 0%, var(--startmenu-header-b) 100%);
  --xp-start-menu-footer-gradient: linear-gradient(to bottom, var(--startmenu-header-a) 0%, var(--startmenu-header-b) 100%);
}
```

### Olijfgroen inputs

```css
[data-theme="olijfgroen"] {
  --win-titlebar-a: #5B7526;
  --win-titlebar-b: #92A45C;
  --win-titlebar-c: #5B7526;
  --xp-titlebar-edge-active: #3E5118;
  --win-titlebar-inactive-a: #8FA278;
  --win-titlebar-inactive-b: #B5BEA0;
  --xp-titlebar-edge-inactive: #728260;
  --win-btn-bg: #92A45C;
  --taskbar-a: #6D7128;
  --taskbar-b: #8C8D43;
  --taskbar-c: #6D7128;
  --taskbar-d: #4A4E18;
  --systray-bg: var(--taskbar-c);
  --startmenu-header-a: #92A45C;
  --startmenu-header-b: #5B7526;
}
```

### Zilver inputs

```css
[data-theme="zilver"] {
  --win-titlebar-a: #5E7CA0;
  --win-titlebar-b: #9AB4D0;
  --win-titlebar-c: #5E7CA0;
  --xp-titlebar-edge-active: #3C546E;
  --win-titlebar-inactive-a: #9DAEC1;
  --win-titlebar-inactive-b: #C4D1DE;
  --xp-titlebar-edge-inactive: #7E8B9A;
  --win-btn-bg: #9AB4D0;
  --taskbar-a: #7C8EA4;
  --taskbar-b: #A4B4C8;
  --taskbar-c: #7C8EA4;
  --taskbar-d: #5A6A80;
  --systray-bg: var(--taskbar-c);
  --startmenu-header-a: #9AB4D0;
  --startmenu-header-b: #5E7CA0;
}
```

### Raw analyzer slot

```css
/* theme: olijfgroen */
/* active titlebar */
linear-gradient(180deg, #8fa46d 0.0%, #e5edc0 4.3%, #bbc88f 11.3%, #a7b580 23.1%, #c2cd95 79.8%, #9fae77 96.3%, #96a867 100.0%)
/* inactive titlebar */
linear-gradient(180deg, #d4d7bc 0.0%, #efeed7 2.8%, #d6dabc 54.2%, #d2d3bd 100.0%)
/* caption buttons */
#97ab63
/* taskbar */
linear-gradient(180deg, #5b703d 0.0%, #9db17c 1.9%, #e2ecbf 5.4%, #c3ce96 11.1%, #acb983 26.0%, #b3c189 83.3%, #96a867 100.0%)
/* taskbar item inactive */
linear-gradient(180deg, #abb084 0.0%, #f4f6dc 4.2%, #dde5bf 18.3%, #c2cba4 69.1%, #c1c994 90.3%, #95a36c 100.0%)
/* taskbar item active */
linear-gradient(180deg, #7c8762 0.0%, #6f795b 0.3%, #838d74 27.7%, #7b885f 100.0%)
/* taskbar unread/notify */
linear-gradient(180deg, #c46c07 0.0%, #e99d33 1.4%, #fbc15f 4.2%, #f3cb7f 9.8%, #f2ac65 80.4%, #fea144 88.8%, #d57814 91.7%, #b65f00 94.5%, #a35c0a 100.0%)
/* systray */
linear-gradient(180deg, #c2b881 0.0%, #faf6dd 2.9%, #eee4b2 11.0%, #dccca1 90.0%, #d3bf8a 95.2%, #a6795e 100.0%)
/* start menu header */
linear-gradient(180deg, #b6cb9c 0.0%, #eaf5d4 3.0%, #b5c893 7.3%, #aebd89 18.0%, #ddedc0 97.6%, #848c65 100.0%)
/* start menu footer */
linear-gradient(180deg, #929877 0.0%, #afb78c 0.2%, #c5d09a 51.1%, #768359 97.3%, #5c6849 100.0%)
/* start menu left col */
#ffffff
/* start menu right col */
#f2f1e4
/* start menu border */
#929877
/* start menu header border */
#848c65
/* start menu footer border */
#909673
/* start menu divider between left/right col */
#d8bc8f
/* start menu left col divider */
#deded6
/* start menu right col divider top */
#d5ba62
/* start menu right col divider bottom */
#f0f0ec
/* start menu item hover */
#93a070
/* context menu item hover */
#93a070
/* note: same as start menu item hover */
/* context menu background */
#ffffff
/* context menu border */
#b5b1a4
/* context menu divider */
#bab7aa
/* start menu accent line */
#d46600
/* note: unlike blue, this accent line does not fade out left/right; it runs through continuously */
/* start button normal */
linear-gradient(180deg, #39581a 0.0%, #4a7137 0.7%, #edf0bf 17.1%, #90a36d 47.5%, #547d43 75.8%, #64975f 92.2%, #6d9f6a 94.5%, #36522b 100.0%)
/* start button hover */
linear-gradient(180deg, #335b12 0.0%, #3d7325 1.9%, #f6fab8 17.9%, #70954d 61.4%, #4a8a3a 82.0%, #65a660 93.4%, #305622 100.0%)
/* start button pressed */
linear-gradient(180deg, #253a1a 0.0%, #838f64 6.1%, #b4ba8f 12.6%, #839661 39.2%, #597b49 70.7%, #294621 100.0%)

/* theme: zilver */
/* active titlebar */
linear-gradient(180deg, #707087 0.0%, #c1c0d1 3.0%, #fcfcfd 5.4%, #a4a3be 19.7%, #fcfdfd 86.4%, #80819a 100.0%)
/* inactive titlebar */
linear-gradient(180deg, #b2b6cc 0.0%, #d2d3dc 2.2%, #f0f1f7 8.8%, #dddde7 30.8%, #f2f3f5 73.7%, #cdccd9 100.0%)
/* caption buttons */
#9b9dbd
/* taskbar */
linear-gradient(180deg, #8f90a8 0.0%, #f5f5f8 5.4%, #9a99b1 14.9%, #b0b5bb 38.7%, #babcca 48.2%, #c5c6c7 53.0%, #ebeaea 86.3%, #e1ebe1 91.0%, #c7ced7 93.4%, #83829d 100.0%)
/* taskbar item inactive */
linear-gradient(180deg, #a9aab3 0.0%, #fefefe 12.2%, #cdcedd 49.7%, #8a8b98 95.9%, #8e8f9c 100.0%)
/* taskbar item active */
linear-gradient(180deg, #6b7882 0.0%, #a5adb5 90.9%, #8d97a3 100.0%)
/* taskbar unread/notify */
linear-gradient(180deg, #c56d0a 0.0%, #e99d33 1.6%, #fec55f 5.9%, #ff9f42 84.0%, #fdab59 89.7%, #feb653 92.5%, #e79a30 95.4%, #c26e10 100.0%)
/* systray */
linear-gradient(180deg, #fefeff 0.0%, #797b93 94.1%, #313849 100.0%)
/* start menu header/footer */
/* start menu header */
linear-gradient(180deg, #66667e 0.0%, #bbbacd 1.7%, #f7f7f9 2.8%, #aaa9c2 10.3%, #ffffff 91.7%, #74777b 100.0%)
/* start menu footer */
linear-gradient(180deg, #818488 0.0%, #e6e6ed 2.6%, #acacc4 91.5%, #555563 100.0%)
/* start menu left col */
#ffffff
/* start menu right col */
#e5e6ed
/* start menu item hover */
#bbb7c7
/* start menu divider between left/right col */
#c2cad2
/* start menu left col divider */
#deded5
/* start menu right col divider top */
#b9c1d2
/* start menu right col divider bottom */
#eaebec
/* start menu header border */
#74777b
/* start menu footer border */
#818488
/* note: no start menu accent line in zilver */
/* start button normal */
linear-gradient(180deg, #2c6913 0.0%, #328f28 0.2%, #b1e88e 9.6%, #eaebec 16.6%, #c9eba9 23.7%, #98d07b 35.4%, #5fa44c 54.3%, #278f27 73.1%, #3fb06e 94.3%, #1d641d 100.0%)
/* start button hover */
linear-gradient(180deg, #238513 0.0%, #75c255 1.0%, #b4fe75 8.1%, #f4f5f8 15.3%, #d4ff97 22.4%, #a8ec70 32.0%, #599d3e 53.5%, #168312 75.0%, #1f9131 86.9%, #1ec755 94.1%, #165f10 100.0%)
/* start button pressed */
linear-gradient(180deg, #1e411b 0.0%, #4c6b42 1.9%, #92b97d 8.9%, #d2d2d3 15.9%, #a6c98d 27.6%, #83ad6d 36.9%, #5e8352 51.0%, #2d662d 72.1%, #38794c 88.4%, #3e945f 93.1%, #2a572a 100.0%)
```

## Hard-line XP varianten

Deze familie gebruikt theme vars uit `00-tokens.css`, maar de zichtbare gradients worden voor meerdere componenten hard overschreven in `08-utilities-overrides.css`.
Voor analyse uit screenshots moet je dus zowel naar token-gradients als naar de render-overrides kijken.

### Theme inputs per variant

```css
[data-theme="royale"]       { --win-titlebar-a: #1C3E7A; --win-titlebar-b: #4682B4; --win-titlebar-d: #0F2750; --win-titlebar-inactive-a: #7D96BE; --win-titlebar-inactive-b: #A6BAD0; --win-btn-bg: #4682B4; --taskbar-a: #13306A; --taskbar-b: #1C4B8E; --startmenu-header-a: #4682B4; --startmenu-header-b: #1C3E7A; --startbtn-a: #2B7A2B; --startbtn-b: #45A845; }
[data-theme="zune"]         { --win-titlebar-a: #3A3A3A; --win-titlebar-b: #5A5A5A; --win-titlebar-d: #1A1A1A; --win-titlebar-inactive-a: #686868; --win-titlebar-inactive-b: #909090; --win-btn-bg: #5A5A5A; --taskbar-a: #2C2C2C; --taskbar-b: #3E3E3E; --startmenu-header-a: #5A5A5A; --startmenu-header-b: #2C2C2C; --startbtn-a: #D45500; --startbtn-b: #F47B20; }
[data-theme="royale-noir"]  { --win-titlebar-a: #1A1A2E; --win-titlebar-b: #2E3E6E; --win-titlebar-d: #0A0A1A; --win-titlebar-inactive-a: #2C2C44; --win-titlebar-inactive-b: #485070; --win-btn-bg: #2E3E6E; --taskbar-a: #141422; --taskbar-b: #1E2040; --startmenu-header-a: #2E3E6E; --startmenu-header-b: #1A1A2E; --startbtn-a: #2B7A2B; --startbtn-b: #45A845; }
[data-theme="energy-blue"]  { --win-titlebar-a: #0068D2; --win-titlebar-b: #38A8F0; --win-titlebar-d: #004AA0; --win-titlebar-inactive-a: #7AAAD8; --win-titlebar-inactive-b: #A5CCEC; --win-btn-bg: #38A8F0; --taskbar-a: #0060C8; --taskbar-b: #28A0F0; --startmenu-header-a: #38A8F0; --startmenu-header-b: #0068D2; --startbtn-a: #3FA142; --startbtn-b: #61BB46; }
```

### Token-level gradients

```css
[data-theme="royale"],
[data-theme="zune"],
[data-theme="royale-noir"],
[data-theme="energy-blue"] {
  --xp-systray-gradient: linear-gradient(to bottom, var(--taskbar-b) 0%, var(--taskbar-a) 49%, color-mix(in srgb, var(--taskbar-a) 70%, black) 50%, var(--taskbar-a) 100%);
  --xp-systray-menu-header-gradient: var(--xp-systray-gradient);
}
```

### Component-level render overrides

```css
[data-theme="royale"] .pane-header,
[data-theme="royale-noir"] .pane-header,
[data-theme="zune"] .pane-header,
[data-theme="energy-blue"] .pane-header {
  background: linear-gradient(to bottom, var(--win-titlebar-b) 0%, var(--win-titlebar-a) 49%, color-mix(in srgb, var(--win-titlebar-a) 70%, black) 50%, var(--win-titlebar-d) 100%);
}

[data-theme="royale"] .pane-header--inactive,
[data-theme="royale-noir"] .pane-header--inactive,
[data-theme="zune"] .pane-header--inactive,
[data-theme="energy-blue"] .pane-header--inactive {
  background: linear-gradient(to bottom, var(--win-titlebar-inactive-b) 0%, var(--win-titlebar-inactive-a) 49%, color-mix(in srgb, var(--win-titlebar-inactive-a) 70%, black) 50%, var(--win-titlebar-inactive-a) 100%);
}

[data-theme="royale"] .pane-btn--minimize,
[data-theme="royale-noir"] .pane-btn--minimize,
[data-theme="zune"] .pane-btn--minimize,
[data-theme="energy-blue"] .pane-btn--minimize,
[data-theme="royale"] .pane-btn--maximize,
[data-theme="royale-noir"] .pane-btn--maximize,
[data-theme="zune"] .pane-btn--maximize,
[data-theme="energy-blue"] .pane-btn--maximize {
  background: linear-gradient(to bottom, color-mix(in srgb, var(--win-btn-bg) 60%, white) 0%, var(--win-btn-bg) 49%, color-mix(in srgb, var(--win-btn-bg) 70%, black) 50%, color-mix(in srgb, var(--win-btn-bg) 85%, black) 100%);
}

[data-theme="royale"] .pane-btn--close,
[data-theme="royale-noir"] .pane-btn--close,
[data-theme="zune"] .pane-btn--close,
[data-theme="energy-blue"] .pane-btn--close {
  background: linear-gradient(to bottom, color-mix(in srgb, var(--pane-btn-close-bg, #e81123) 60%, white) 0%, var(--pane-btn-close-bg, #e81123) 49%, color-mix(in srgb, var(--pane-btn-close-bg, #e81123) 70%, black) 50%, color-mix(in srgb, var(--pane-btn-close-bg, #e81123) 85%, black) 100%);
}

[data-theme="royale"] .taskbar,
[data-theme="royale-noir"] .taskbar,
[data-theme="zune"] .taskbar,
[data-theme="energy-blue"] .taskbar {
  background: linear-gradient(to bottom, var(--taskbar-b) 0%, var(--taskbar-a) 49%, color-mix(in srgb, var(--taskbar-a) 70%, black) 50%, var(--taskbar-a) 100%);
}

[data-theme="royale"] .start-btn,
[data-theme="royale-noir"] .start-btn,
[data-theme="zune"] .start-btn,
[data-theme="energy-blue"] .start-btn {
  background: linear-gradient(to bottom, var(--startbtn-b) 0%, var(--startbtn-a) 49%, color-mix(in srgb, var(--startbtn-a) 70%, black) 50%, var(--startbtn-a) 100%);
}

[data-theme="royale"] .start-menu-header,
[data-theme="royale-noir"] .start-menu-header,
[data-theme="zune"] .start-menu-header,
[data-theme="energy-blue"] .start-menu-header,
[data-theme="royale"] .start-menu-footer,
[data-theme="royale-noir"] .start-menu-footer,
[data-theme="zune"] .start-menu-footer,
[data-theme="energy-blue"] .start-menu-footer {
  background: linear-gradient(to bottom, var(--startmenu-header-a) 0%, var(--startmenu-header-b) 49%, color-mix(in srgb, var(--startmenu-header-b) 70%, black) 50%, var(--startmenu-header-b) 100%);
}
```

### Raw analyzer slot

```css
/* theme: royale */
/* titlebar active/inactive */
/* taskbar */
/* start button */
/* start menu header/footer */
/* caption buttons */

/* theme: zune */
/* titlebar active/inactive */
/* taskbar */
/* start button */
/* start menu header/footer */
/* caption buttons */

/* theme: royale-noir */
/* titlebar active/inactive */
/* taskbar */
/* start button */
/* start menu header/footer */
/* caption buttons */

/* theme: energy-blue */
/* titlebar active/inactive */
/* taskbar */
/* start button */
/* start menu header/footer */
/* caption buttons */
```

## Opmerking

Als je analyzer exacte WinXP Blue stopwaarden oplevert, vergelijk die eerst met `luna-custom`.
Die sectie volgt al de uitgebreide XP-structuur en is daarom de beste basis om de standaard `blauw` variant later nauwkeuriger te maken.
