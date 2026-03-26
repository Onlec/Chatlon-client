import arcadeMap from './maps/arcade.tiled.json';
import barMap from './maps/bar.tiled.json';
import hallwayMap from './maps/hallway.tiled.json';
import kelderMap from './maps/kelder.tiled.json';
import laundryMap from './maps/laundry.tiled.json';
import parkingMap from './maps/parking.tiled.json';
import receptieMap from './maps/receptie.tiled.json';
import { compileChabloRoomFromTiledMap } from './tiledRoomLoader';

export const DEFAULT_CHABLO_ROOM_ID = 'receptie';

const TILED_CHABLO_ROOM_MAPS = [
  receptieMap,
  hallwayMap,
  arcadeMap,
  barMap,
  kelderMap,
  laundryMap,
  parkingMap
];

export const CHABLO_ROOMS = TILED_CHABLO_ROOM_MAPS.map((map) => compileChabloRoomFromTiledMap(map));

export const CHABLO_ROOM_SCALE = CHABLO_ROOMS[0]?.scale || 1;

const ROOM_MAP = CHABLO_ROOMS.reduce((next, room) => {
  next[room.id] = room;
  return next;
}, {});

export function getChabloRoom(roomId) {
  return ROOM_MAP[roomId] || ROOM_MAP[DEFAULT_CHABLO_ROOM_ID];
}

export function getChabloRoomSpawnPosition(roomId) {
  const room = getChabloRoom(roomId);
  return { ...room.spawn };
}

export function getChabloRoomDimensions(roomId) {
  const room = getChabloRoom(roomId);
  return {
    width: room.layout[0]?.length || 0,
    height: room.layout.length
  };
}
