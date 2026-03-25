import barMap from './maps/bar.tiled.json';
import receptieMap from './maps/receptie.tiled.json';
import { compileChabloRoomFromTiledMap } from './tiledRoomLoader';

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
});
