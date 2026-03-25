import {
  getChabloRoom,
  getChabloRoomDimensions,
  getChabloRoomSpawnPosition
} from './rooms';
import { STAGE_PADDING, TILE_SIZE } from './graphics';

const BLOCKED_TILE_CODES = new Set(['#', 'T', 'B', 'C']);

function clampToBounds(roomId, position) {
  const dimensions = getChabloRoomDimensions(roomId);
  return {
    x: Math.max(0, Math.min(dimensions.width - 1, Number(position?.x) || 0)),
    y: Math.max(0, Math.min(dimensions.height - 1, Number(position?.y) || 0))
  };
}

export function getRoomTileCode(roomId, position) {
  const room = getChabloRoom(roomId);
  const nextPosition = clampToBounds(roomId, position);
  return room.layout[nextPosition.y]?.[nextPosition.x] || null;
}

export function isWalkableRoomPosition(roomId, position) {
  const dimensions = getChabloRoomDimensions(roomId);
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }
  if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height) {
    return false;
  }
  return !BLOCKED_TILE_CODES.has(getRoomTileCode(roomId, position));
}

export function normalizeRoomPosition(roomId, position, fallbackPosition = getChabloRoomSpawnPosition(roomId)) {
  const clamped = clampToBounds(roomId, position);
  if (isWalkableRoomPosition(roomId, clamped)) {
    return clamped;
  }
  const fallback = clampToBounds(roomId, fallbackPosition);
  if (isWalkableRoomPosition(roomId, fallback)) {
    return fallback;
  }
  return clamped;
}

export function getDoorAtPosition(roomId, position) {
  const room = getChabloRoom(roomId);
  const nextPosition = normalizeRoomPosition(roomId, position);
  const door = room.doors.find((candidate) => candidate.x === nextPosition.x && candidate.y === nextPosition.y);
  if (!door) {
    return null;
  }
  return {
    ...door,
    nextRoomId: door.to,
    spawnPosition: normalizeRoomPosition(door.to, door.spawn)
  };
}

export function getHotspotAtPosition(roomId, position) {
  const room = getChabloRoom(roomId);
  const nextPosition = normalizeRoomPosition(roomId, position);
  return room.hotspots?.find((hotspot) => (
    (
      nextPosition.x === hotspot.target.x
      && nextPosition.y === hotspot.target.y
    )
    || (
      nextPosition.x >= hotspot.x
      && nextPosition.x < hotspot.x + hotspot.width
      && nextPosition.y >= hotspot.y
      && nextPosition.y < hotspot.y + hotspot.height
    )
  )) || null;
}

export function resolveRoomMovement(roomId, currentPosition, deltaX, deltaY) {
  const origin = normalizeRoomPosition(roomId, currentPosition);
  const proposed = {
    x: origin.x + deltaX,
    y: origin.y + deltaY
  };

  if (!isWalkableRoomPosition(roomId, proposed)) {
    return {
      moved: false,
      blocked: true,
      position: origin,
      door: null
    };
  }

  const nextPosition = normalizeRoomPosition(roomId, proposed, origin);
  const door = getDoorAtPosition(roomId, nextPosition);
  return {
    moved: true,
    blocked: false,
    position: nextPosition,
    door
  };
}

export function getRoomSpawnPosition(roomId) {
  return normalizeRoomPosition(roomId, getChabloRoomSpawnPosition(roomId));
}

export function getTileFromStagePoint(point) {
  const tileX = Math.floor((Number(point?.x) - STAGE_PADDING) / TILE_SIZE);
  const tileY = Math.floor((Number(point?.y) - STAGE_PADDING) / TILE_SIZE);
  if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) {
    return null;
  }
  return { x: tileX, y: tileY };
}

function encodePosition(position) {
  return `${position.x},${position.y}`;
}

export function findRoomPath(roomId, startPosition, targetPosition) {
  const start = normalizeRoomPosition(roomId, startPosition);
  const target = normalizeRoomPosition(roomId, targetPosition, targetPosition);

  if (
    !isWalkableRoomPosition(roomId, target)
    || (start.x === target.x && start.y === target.y)
  ) {
    return [];
  }

  const queue = [start];
  const visited = new Set([encodePosition(start)]);
  const previous = new Map();
  const neighbors = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current.x === target.x && current.y === target.y) {
      break;
    }

    neighbors.forEach((delta) => {
      const next = {
        x: current.x + delta.x,
        y: current.y + delta.y
      };
      const nextKey = encodePosition(next);
      if (visited.has(nextKey) || !isWalkableRoomPosition(roomId, next)) {
        return;
      }
      visited.add(nextKey);
      previous.set(nextKey, current);
      queue.push(next);
    });
  }

  const targetKey = encodePosition(target);
  if (!previous.has(targetKey)) {
    return [];
  }

  const path = [];
  let current = target;
  while (current && !(current.x === start.x && current.y === start.y)) {
    path.unshift(current);
    current = previous.get(encodePosition(current));
  }

  return path;
}
