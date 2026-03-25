# Chablo Tiled Rooms

`chablo.motel` leest zijn roomdata uit Tiled JSON-bestanden onder:

- `src/components/panes/internal/chablo/maps/*.tiled.json`

De loader compileert die maps naar de bestaande runtime room-shape in:

- `src/components/panes/internal/chablo/tiledRoomLoader.js`

## Verplichte map properties

Elke roommap moet deze Tiled map properties hebben:

- `id`
- `name`
- `accent`
- `roomScale`

Optioneel:

- `description`

## Verplichte layernamen

Elke map moet exact deze lagen bevatten:

- `layout` (`tilelayer`)
- `objects` (`objectgroup`)
- `decor` (`objectgroup`)

Optioneel:

- `hotspots` (`objectgroup`)

De loader valideert deze namen expliciet. Andere namen worden niet gebruikt voor de room-runtime.

## Layout layer

`layout` gebruikt tile properties met een `code` property.

Ondersteunde tilecodes:

- `.` = walkable floor
- `#` = wall / blocked
- `T` = blocked table tile
- `B` = blocked bar/counter tile
- `C` = blocked crate/solid basement tile
- `P` = parking accent tile

De `layout` layer is de bron van waarheid voor:

- room bounds
- walkability
- pathfinding
- deurbereik

## Objects layer

`objects` ondersteunt alleen:

- `spawn`
- `door`

Regels:

- exact 1 `spawn` object per room
- elke `door` moet properties hebben:
  - `to`
  - `spawnX`
  - `spawnY`
- `label` is optioneel maar aanbevolen

Voorbeeld `door` properties:

- `to = "bar"`
- `label = "Bar"`
- `spawnX = 1`
- `spawnY = 3`

Alle objectcoordinaten worden als tileposities geïnterpreteerd via `x / tilewidth` en `y / tileheight`.

## Decor layer

`decor` ondersteunt momenteel:

- `rug`
- `counter`
- `sofa`
- `crate`
- `pipe`
- `parking-lines`
- `car`
- `neon`
- `sign`
- `table`
- `plant`
- `lamp`
- `stool`

Notities:

- `stool` objects met dezelfde naam/kleur worden automatisch gegroepeerd tot één `stools` runtime item
- area decor (`rug`, `counter`, `sofa`, `crate`, `pipe`, `parking-lines`, `car`, `neon`, `sign`) gebruikt `width/height`
- point decor (`table`, `plant`, `lamp`, `stool`) gebruikt alleen de objectpositie

## Hotspots layer

`hotspots` is optioneel, maar aanbevolen voor room-interacties.

Deze laag ondersteunt alleen:

- `hotspot`

Elke hotspot moet hebben:

- een object `name` of property `label`
- `targetX`
- `targetY`

Aanbevolen properties:

- `kind`
- `description`
- `feedback`
- `actionLabel`
- `icon`
- `accent`

Optionele actieproperties:

- `actionType`
- `actionTitle`
- `actionText`
- `actionMessage`
- `actionButton`
- `actionRoom`
- `actionTargetX`
- `actionTargetY`

Hotspots worden gebruikt voor:

- klikbare roommarkers in Phaser
- room-interactiekaarten in de sidebar
- contextuele feedback wanneer een speler een hotspot bereikt

Ondersteunde `actionType` waarden:

- `bulletin`
- `feedback`
- `prefill-chat`
- `room-jump`

## Schaal

De runtime gebruikt `roomScale`.

Voor `chablo.motel` staat die momenteel op:

- `roomScale = 2`

Dat betekent:

- layout wordt 2x opgeschaald
- spawns en deuren landen in het midden van de opgeschaalde tileblokken
- decor wordt mee opgeschaald naar de huidige Phaser runtime

## Workflow voor nieuwe rooms

1. Maak een nieuwe `.tiled.json` map in `src/components/panes/internal/chablo/maps/`
2. Voeg de verplichte properties toe
3. Voeg `layout`, `objects` en `decor` toe
4. Zorg voor exact één `spawn`
5. Voeg `door` objects met `to`, `spawnX`, `spawnY` toe
6. Import de map in `src/components/panes/internal/chablo/rooms.js`
7. Laat de tests draaien

## Relevante tests

- `src/components/panes/internal/chablo/tiledRoomLoader.test.js`
- `src/components/panes/internal/chablo/rooms.test.js`
- `src/components/panes/internal/chablo/movement.test.js`
- `src/components/panes/internal/ChabloMotelView.test.js`

Als een map niet aan deze conventies voldoet, moet de loader fail-fast gooien tijdens test/build in plaats van stil afwijkend gedrag te produceren.
