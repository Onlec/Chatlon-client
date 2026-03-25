import {
  findRoomPath,
  getDoorAtPosition,
  getHotspotAtPosition,
  getRoomSpawnPosition,
  getTileFromStagePoint,
  isWalkableRoomPosition,
  normalizeRoomPosition,
  resolveRoomMovement
} from './movement';

describe('Chablo movement helpers', () => {
  test('rejects blocked and out-of-bounds positions', () => {
    expect(isWalkableRoomPosition('receptie', { x: 9, y: 7 })).toBe(true);
    expect(isWalkableRoomPosition('receptie', { x: 0, y: 7 })).toBe(false);
    expect(isWalkableRoomPosition('bar', { x: 7, y: 3 })).toBe(false);
    expect(isWalkableRoomPosition('parking', { x: -1, y: 7 })).toBe(false);
  });

  test('normalizes invalid positions back to a walkable room tile', () => {
    expect(normalizeRoomPosition('kelder', { x: 7, y: 8 })).toEqual(getRoomSpawnPosition('kelder'));
    expect(normalizeRoomPosition('parking', { x: 99, y: 99 })).toEqual(getRoomSpawnPosition('parking'));
  });

  test('resolves door transitions from walkable door tiles', () => {
    const door = getDoorAtPosition('receptie', { x: 17, y: 7 });
    expect(door).toEqual(expect.objectContaining({
      nextRoomId: 'bar',
      label: 'Bar',
      spawnPosition: { x: 3, y: 7 }
    }));
  });

  test('finds scaled room hotspots by occupied tile', () => {
    expect(getHotspotAtPosition('receptie', { x: 9, y: 9 })).toEqual(expect.objectContaining({
      id: 'Balie',
      label: 'Balie',
      target: { x: 9, y: 9 }
    }));

    expect(getHotspotAtPosition('bar', { x: 4, y: 4 })).toBeNull();
  });

  test('moves across walkable tiles and returns door metadata when crossing a door', () => {
    const blockedMove = resolveRoomMovement('receptie', { x: 9, y: 6 }, 0, -1);
    expect(blockedMove).toEqual(expect.objectContaining({
      moved: false,
      blocked: true,
      position: { x: 9, y: 6 },
      door: null
    }));

    const freeMove = resolveRoomMovement('receptie', { x: 9, y: 7 }, 0, 1);
    expect(freeMove).toEqual(expect.objectContaining({
      moved: true,
      blocked: false,
      position: { x: 9, y: 8 },
      door: null
    }));

    const doorMove = resolveRoomMovement('receptie', { x: 9, y: 10 }, 0, 1);
    expect(doorMove.moved).toBe(true);
    expect(doorMove.door).toEqual(expect.objectContaining({
      nextRoomId: 'kelder',
      spawnPosition: { x: 9, y: 3 }
    }));
  });

  test('maps stage points to tiles and finds same-room paths around obstacles', () => {
    expect(getTileFromStagePoint({ x: 20 + 48 * 9 + 10, y: 20 + 48 * 7 + 10 })).toEqual({ x: 9, y: 7 });

    expect(findRoomPath('receptie', { x: 9, y: 7 }, { x: 15, y: 7 })).toEqual([
      { x: 10, y: 7 },
      { x: 11, y: 7 },
      { x: 12, y: 7 },
      { x: 13, y: 7 },
      { x: 14, y: 7 },
      { x: 15, y: 7 }
    ]);

    expect(findRoomPath('bar', { x: 3, y: 7 }, { x: 7, y: 3 })).toEqual([]);
  });
});
