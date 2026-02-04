# AI-workflow & usage tips (Claude/LLM)

Deze richtlijnen helpen om je token- en usage-limiet te beperken, terwijl je toch effectief wijzigingen kunt laten uitvoeren.

## Praktische tips om usage te beperken
- **Beperk context:** geef alleen de relevante bestanden/fragmenten mee.
- **Vraag om gerichte diffs:** laat blokken toevoegen/vervangen i.p.v. volledige files.
- **Werk in kleine stappen:** splits features op in kleinere taken zodat elke prompt kort blijft.
- **Herbruik korte samenvattingen:** vraag eerst om een samenvatting van de codebase, daarna enkel specifieke context.
- **Vermijd grote dumps:** vraag om “alleen relevante regels” i.p.v. hele bestanden.

## Wanneer welk model?
- **Snelle iteraties:** gebruik een kleiner/goedkoper model voor “mechanische” wijzigingen (renames, simpele copy, styling).
- **Complexe logica/architectuur:** gebruik een sterker model (zoals Opus) voor ontwerpbeslissingen, bugfixes of refactors.
- **Hybride aanpak:** laat een kleiner model het plan maken en schakel pas over naar Opus voor het moeilijke stuk.

## Gewenst formaat voor wijzigingen (compacte patches)
Vraag om deze vorm zodat je eenvoudig kan copy-pasten:

```
Bestand: src/voorbeeld.js
Vervang regels 10-22 door:
<nieuw blok>

Bestand: src/anderBestand.js
Voeg na regel 45 toe:
<nieuw blok>
```

## Als je aan een feature/bugfix werkt
Werk dit document bij met:
- Korte samenvatting van de wijziging.
- Welke bestanden aangepast zijn.
- Hoe je de wijziging kan testen (commands).

## Changelog (laatste wijziging)
- Nog geen wijzigingslog toegevoegd. Voeg hier de volgende updates toe.
