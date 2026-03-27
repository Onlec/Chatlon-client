import { useCallback, useEffect, useRef } from 'react';
import { normalizeRoomPosition } from './movement';
import { getChabloRoomSpawnPosition } from './rooms';

export function useChabloPresenceSync({
  activeHotspot,
  currentRoom,
  currentUser,
  gunApi,
  heartbeatMs,
  position
}) {
  const latestRoomRef = useRef(currentRoom);
  const latestPositionRef = useRef(position);
  const publishedHotspotPresenceRef = useRef({
    roomId: currentRoom,
    hotspotId: null
  });

  const syncPosition = useCallback((nextRoom, nextPosition) => {
    const positionNode = gunApi?.get?.('CHABLO_POSITION')?.get?.(currentUser);
    const normalizedPosition = normalizeRoomPosition(
      nextRoom,
      nextPosition,
      getChabloRoomSpawnPosition(nextRoom)
    );
    positionNode?.put?.({
      room: nextRoom,
      x: normalizedPosition.x,
      y: normalizedPosition.y,
      lastSeen: Date.now()
    });
  }, [currentUser, gunApi]);

  const syncHotspotPresence = useCallback((nextRoom, hotspot) => {
    const presenceNode = gunApi?.get?.('CHABLO_HOTSPOT_PRESENCE')?.get?.(nextRoom)?.get?.(currentUser);
    presenceNode?.put?.({
      hotspotId: hotspot?.id || null,
      hotspotLabel: hotspot?.label || null,
      lastSeen: Date.now()
    });
  }, [currentUser, gunApi]);

  const clearHotspotPresence = useCallback((roomId) => {
    if (!roomId) {
      return;
    }
    gunApi?.get?.('CHABLO_HOTSPOT_PRESENCE')?.get?.(roomId)?.get?.(currentUser)?.put?.(null);
  }, [currentUser, gunApi]);

  useEffect(() => {
    latestRoomRef.current = currentRoom;
    latestPositionRef.current = position;
  }, [currentRoom, position]);

  useEffect(() => {
    syncPosition(currentRoom, position);

    const heartbeat = window.setInterval(() => {
      syncPosition(currentRoom, position);
    }, heartbeatMs);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [currentRoom, heartbeatMs, position, syncPosition]);

  useEffect(() => {
    const previousPublished = publishedHotspotPresenceRef.current;
    if (previousPublished.roomId && previousPublished.roomId !== currentRoom) {
      clearHotspotPresence(previousPublished.roomId);
    }

    syncHotspotPresence(currentRoom, activeHotspot);
    publishedHotspotPresenceRef.current = {
      roomId: currentRoom,
      hotspotId: activeHotspot?.id || null
    };

    const heartbeat = window.setInterval(() => {
      syncHotspotPresence(currentRoom, activeHotspot);
    }, heartbeatMs);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [activeHotspot, clearHotspotPresence, currentRoom, heartbeatMs, syncHotspotPresence]);

  useEffect(() => () => {
    gunApi?.get?.('CHABLO_POSITION')?.get?.(currentUser)?.put?.({
      room: latestRoomRef.current,
      x: latestPositionRef.current.x,
      y: latestPositionRef.current.y,
      lastSeen: 0
    });
    clearHotspotPresence(publishedHotspotPresenceRef.current.roomId);
  }, [clearHotspotPresence, currentUser, gunApi]);
}
