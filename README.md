# Chatlon Client

Chatlon is een retro Windows-achtige chatdesktop gebouwd in React. De app orchestreert meerdere vensters (contacten, chat, notepad, calculator, paint, browser, media) en gebruikt [Gun](https://gun.eco/) voor realtime data en presence.

## Features
- Multi-pane desktop ervaring met taskbar, startmenu en vensters.
- Contacten- en conversatievensters met toastmeldingen.
- Extra apps zoals notepad, calculator, paint, browser en media player.

## Tech stack
- React 19 + Create React App.
- Gun + SEA voor realtime data en auth.

## Installatie
```bash
npm install
```

## Ontwikkelen
```bash
npm start
```

## Build
```bash
npm run build
```

## Testen
```bash
npm test
```

## Configuratie
Stel een Gun peer in via een omgevingsvariabele:
```bash
REACT_APP_GUN_URL=https://<jouw-gun-peer>
```

## Werkafspraken voor documentatie
- Werk `AI-WORKFLOW.md` bij bij elke feature/fix met wat er gewijzigd is en welke stappen er nodig zijn om het te testen.
- Gebruik compacte diff-instructies (blokken + referentielijnen) in plaats van hele bestanden om token-usage te beperken.
