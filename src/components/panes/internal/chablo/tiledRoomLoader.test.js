import barMap from './maps/bar.tiled.json';
import hallwayMap from './maps/hallway.tiled.json';
import receptieMap from './maps/receptie.tiled.json';
import { compileChabloRoomFromTiledMap, validateChabloTiledMap } from './tiledRoomLoader';

describe('compileChabloRoomFromTiledMap', () => {
  test('builds a scaled Chablo room from Tiled JSON map data', () => {
    const room = compileChabloRoomFromTiledMap(receptieMap);

    expect(room).toEqual(expect.objectContaining({
      id: 'receptie',
      name: 'Receptie',
      accent: '#f0c97c',
      scale: 2,
      spawn: { x: 9, y: 7 }
    }));
    expect(room.layout[0]).toHaveLength(20);
    expect(room.layout).toHaveLength(14);
    expect(room.doors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        x: 17,
        y: 7,
        to: 'bar',
        spawn: { x: 3, y: 7 }
      })
    ]));
    expect(room.decor).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'counter',
        x: 4,
        y: 10,
        width: 8,
        height: 2,
        renderScale: 2
      }),
      expect.objectContaining({
        type: 'lamp',
        x: 5,
        y: 3,
        renderScale: 2
      })
    ]));
    expect(room.hotspots).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'Balie',
        kind: 'receptie',
        label: 'Balie',
        target: { x: 9, y: 9 },
        width: 8,
        height: 2,
        action: expect.objectContaining({
          type: 'bulletin',
          title: 'Motelbord'
        }),
        renderScale: 2
      })
    ]));
  });

  test('groups repeated stool objects into one stools decor item', () => {
    const room = compileChabloRoomFromTiledMap(barMap);
    const stools = room.decor.find((item) => item.type === 'stools');

    expect(stools).toEqual(expect.objectContaining({
      color: '#d48b5d',
      renderScale: 2
    }));
    expect(stools.positions).toEqual([
      { x: 5, y: 5 },
      { x: 7, y: 5 },
      { x: 13, y: 11 },
      { x: 15, y: 11 }
    ]);
  });

  test('requires the expected Chablo Tiled layer names and spawn contract', () => {
    const invalidMap = {
      ...receptieMap,
      layers: receptieMap.layers.map((layer) => {
        if (layer.name === 'layout') {
          return {
            ...layer,
            name: 'ground'
          };
        }
        return layer;
      })
    };

    expect(() => validateChabloTiledMap(invalidMap)).toThrow(
      'mist verplichte tilelayer-laag "layout"'
    );

    const noSpawnMap = {
      ...receptieMap,
      layers: receptieMap.layers.map((layer) => {
        if (layer.name !== 'objects') {
          return layer;
        }
        return {
          ...layer,
          objects: layer.objects.filter((object) => object.type !== 'spawn')
        };
      })
    };

    expect(() => validateChabloTiledMap(noSpawnMap)).toThrow(
      'moet exact 1 spawn object hebben'
    );
  });

  test('rejects unsupported decor object types early', () => {
    const invalidMap = {
      ...barMap,
      layers: barMap.layers.map((layer) => {
        if (layer.name !== 'decor') {
          return layer;
        }
        return {
          ...layer,
          objects: [
            ...layer.objects,
            {
              id: 999,
              name: 'jukebox',
              type: 'jukebox',
              x: 48,
              y: 48,
              width: 24,
              height: 24
            }
          ]
        };
      })
    };

    expect(() => compileChabloRoomFromTiledMap(invalidMap)).toThrow(
      'niet-ondersteund decor type "jukebox"'
    );
  });

  test('requires hotspot target metadata when a hotspots layer is present', () => {
    const invalidMap = {
      ...receptieMap,
      layers: receptieMap.layers.map((layer) => {
        if (layer.name !== 'hotspots') {
          return layer;
        }
        return {
          ...layer,
          objects: [{
            ...layer.objects[0],
            properties: layer.objects[0].properties.filter((property) => property.name !== 'targetX')
          }]
        };
      })
    };

    expect(() => compileChabloRoomFromTiledMap(invalidMap)).toThrow(
      'mist geldige targetX/targetY properties'
    );
  });

  test('rejects unsupported hotspot action types early', () => {
    const invalidMap = {
      ...receptieMap,
      layers: receptieMap.layers.map((layer) => {
        if (layer.name !== 'hotspots') {
          return layer;
        }
        return {
          ...layer,
          objects: [{
            ...layer.objects[0],
            properties: [
              ...layer.objects[0].properties.filter((property) => property.name !== 'actionType'),
              { name: 'actionType', type: 'string', value: 'launch-missiles' }
            ]
          }]
        };
      })
    };

    expect(() => compileChabloRoomFromTiledMap(invalidMap)).toThrow(
      'niet-ondersteund actionType "launch-missiles"'
    );
  });

  test('parses wardrobe hotspots from hallway maps', () => {
    const room = compileChabloRoomFromTiledMap(hallwayMap);
    const wardrobeHotspot = room.hotspots.find((hotspot) => hotspot.label === 'Wardrobe spiegel');

    expect(wardrobeHotspot).toEqual(expect.objectContaining({
      kind: 'wardrobe',
      action: expect.objectContaining({
        type: 'open-wardrobe',
        title: 'Motel wardrobe'
      })
    }));
  });
});
