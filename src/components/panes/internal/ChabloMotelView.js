import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gun } from '../../../gun';
import ChabloPhaserStage from './chablo/ChabloPhaserStage';
import {
  CHABLO_ROOMS,
  DEFAULT_CHABLO_ROOM_ID,
  getChabloRoom,
  getChabloRoomSpawnPosition
} from './chablo/rooms';
import {
  getHotspotAtPosition,
  normalizeRoomPosition
} from './chablo/movement';
import { useChabloMovementController } from './chablo/useChabloMovementController';

const STALE_POSITION_MS = 30000;
const HEARTBEAT_MS = 10000;
const HOTSPOT_PRESENCE_STALE_MS = 15000;
const ROOM_ACTIVITY_LIMIT = 8;
const DEFAULT_SIDEBAR_TAB = 'hotspots';

export const DEFAULT_CHABLO_ROOMS = CHABLO_ROOMS;

function sanitizeNode(node) {
  if (!node || typeof node !== 'object') return {};
  const next = { ...node };
  delete next._;
  delete next['#'];
  return next;
}

function isPositionFresh(position) {
  return position && (Date.now() - (Number(position.lastSeen) || 0) <= STALE_POSITION_MS);
}

function normalizeFriendEntries(friendMap) {
  return Object.entries(friendMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([username, value]) => ({
      username,
      status: value.status || 'pending',
      since: Number(value.since) || 0,
      metIn: value.metIn || null,
      initiator: value.initiator || null
    }))
    .sort((left, right) => left.username.localeCompare(right.username));
}

function normalizeRoomMessages(messageMap) {
  return Object.entries(messageMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id,
      from: value.van || 'onbekend',
      text: value.tekst || '',
      timestamp: Number(value.timestamp) || 0
    }))
    .sort((left, right) => left.timestamp - right.timestamp);
}

function normalizeHotspotPresenceEntries(presenceMap, currentUser) {
  return Object.entries(presenceMap)
    .filter(([username, value]) => (
      username !== currentUser
      && value
      && typeof value === 'object'
      && typeof value.hotspotId === 'string'
      && value.hotspotId
      && (Date.now() - (Number(value.lastSeen) || 0) <= HOTSPOT_PRESENCE_STALE_MS)
    ))
    .map(([username, value]) => ({
      username,
      hotspotId: value.hotspotId,
      hotspotLabel: value.hotspotLabel || value.hotspotId,
      lastSeen: Number(value.lastSeen) || 0
    }))
    .sort((left, right) => (
      left.hotspotId.localeCompare(right.hotspotId)
      || left.username.localeCompare(right.username)
    ));
}

function normalizeRoomActivityEntries(activityMap) {
  return Object.entries(activityMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id,
      by: value.by || 'onbekend',
      room: value.room || null,
      hotspotId: value.hotspotId || null,
      hotspotLabel: value.hotspotLabel || value.hotspotId || 'hotspot',
      actionType: value.actionType || 'feedback',
      summary: value.summary || '',
      timestamp: Number(value.timestamp) || 0
    }))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, ROOM_ACTIVITY_LIMIT);
}

function normalizeRoomStateEntries(roomStateMap) {
  return Object.entries(roomStateMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([hotspotId, value]) => ({
      hotspotId,
      hotspotLabel: value.hotspotLabel || hotspotId,
      title: value.title || value.hotspotLabel || hotspotId,
      text: value.text || '',
      detail: value.detail || '',
      by: value.by || 'onbekend',
      kind: value.kind || 'status',
      updatedAt: Number(value.updatedAt) || 0
    }))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

function buildSharedRoomStatePayload(hotspot, actionType, currentUser) {
  const lowerLabel = hotspot.label.toLowerCase();

  if (hotspot.label === 'Balie') {
    return {
      title: 'Receptie live',
      text: `${currentUser} checkt in bij de balie.`,
      detail: 'Het motelbord is weer even het centrum van de lobby.',
      kind: 'receptie'
    };
  }

  if (hotspot.label === 'Bartoog') {
    return {
      title: 'Barstatus',
      text: `${currentUser} zet de toon aan de bar.`,
      detail: 'De kamer ruikt ineens naar pixelcocktails en halve gesprekken.',
      kind: 'bar'
    };
  }

  if (hotspot.label === 'Dansvloer') {
    return {
      title: 'Dansvloer bezet',
      text: `${currentUser} claimt de dansvloer.`,
      detail: 'Zelfs stilstaan telt hier als performance.',
      kind: 'dance'
    };
  }

  return {
    title: hotspot.label,
    text: `${currentUser} activeert ${lowerLabel}.`,
    detail: hotspot.action?.text || hotspot.feedback || hotspot.description || '',
    kind: actionType || hotspot.kind || 'status'
  };
}

export function ChabloMotelView({
  currentUser = 'guest',
  onOpenConversation,
  gunApi = gun
}) {
  const [currentRoom, setCurrentRoom] = useState(DEFAULT_CHABLO_ROOM_ID);
  const [position, setPosition] = useState(() => getChabloRoomSpawnPosition(DEFAULT_CHABLO_ROOM_ID));
  const [allPositions, setAllPositions] = useState({});
  const [friendEntries, setFriendEntries] = useState([]);
  const [roomMessages, setRoomMessages] = useState([]);
  const [hotspotPresenceEntries, setHotspotPresenceEntries] = useState([]);
  const [roomActivityEntries, setRoomActivityEntries] = useState([]);
  const [roomStateEntries, setRoomStateEntries] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [roomActionState, setRoomActionState] = useState(null);
  const [roomChatInput, setRoomChatInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [stageEngineState, setStageEngineState] = useState('loading');
  const [activeSidebarTab, setActiveSidebarTab] = useState(DEFAULT_SIDEBAR_TAB);
  const feedbackTimerRef = useRef(null);
  const latestRoomRef = useRef(currentRoom);
  const latestPositionRef = useRef(position);
  const lastHotspotFeedbackRef = useRef('');
  const roomChatInputRef = useRef(null);
  const publishedHotspotPresenceRef = useRef({
    roomId: currentRoom,
    hotspotId: null
  });

  const currentRoomMeta = useMemo(
    () => getChabloRoom(currentRoom),
    [currentRoom]
  );

  const otherOccupants = useMemo(() => (
    Object.entries(allPositions)
      .filter(([username, occupant]) => (
        username !== currentUser
        && occupant?.room === currentRoom
        && isPositionFresh(occupant)
      ))
      .map(([username, occupant]) => ({
        username,
        ...normalizeRoomPosition(
          occupant?.room || currentRoom,
          occupant,
          getChabloRoomSpawnPosition(occupant?.room || currentRoom)
        )
      }))
      .sort((left, right) => left.username.localeCompare(right.username))
  ), [allPositions, currentRoom, currentUser]);

  const incomingRequests = friendEntries.filter((entry) => (
    entry.status === 'pending' && entry.initiator && entry.initiator !== currentUser
  ));
  const outgoingRequests = friendEntries.filter((entry) => (
    entry.status === 'pending' && entry.initiator === currentUser
  ));
  const acceptedFriends = friendEntries.filter((entry) => entry.status === 'accepted');
  const selectedFriendship = friendEntries.find((entry) => entry.username === selectedAvatar);
  const activeHotspot = useMemo(
    () => getHotspotAtPosition(currentRoom, position),
    [currentRoom, position]
  );
  const selectedHotspot = useMemo(
    () => currentRoomMeta.hotspots?.find((hotspot) => hotspot.id === selectedHotspotId) || null,
    [currentRoomMeta.hotspots, selectedHotspotId]
  );
  const highlightedHotspot = selectedHotspot || activeHotspot || null;
  const hotspotPresenceById = useMemo(() => (
    hotspotPresenceEntries.reduce((next, entry) => {
      if (!next[entry.hotspotId]) {
        next[entry.hotspotId] = [];
      }
      next[entry.hotspotId].push(entry);
      return next;
    }, {})
  ), [hotspotPresenceEntries]);
  const latestHotspotActivityById = useMemo(() => (
    roomActivityEntries.reduce((next, entry) => {
      if (!entry.hotspotId || next[entry.hotspotId]) {
        return next;
      }
      next[entry.hotspotId] = entry;
      return next;
    }, {})
  ), [roomActivityEntries]);
  const roomStateByHotspotId = useMemo(() => (
    roomStateEntries.reduce((next, entry) => {
      next[entry.hotspotId] = entry;
      return next;
    }, {})
  ), [roomStateEntries]);

  const setFeedback = useCallback((message) => {
    setFeedbackMessage(message);
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage('');
      feedbackTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
  }, []);

  useEffect(() => {
    latestRoomRef.current = currentRoom;
    latestPositionRef.current = position;
  }, [currentRoom, position]);

  useEffect(() => {
    const positionsRoot = gunApi?.get?.('CHABLO_POSITION');
    const positionMapNode = positionsRoot?.map?.();
    const nextPositions = {};

    if (positionMapNode?.on) {
      positionMapNode.on((incomingPosition, username) => {
        if (!incomingPosition || typeof incomingPosition !== 'object') {
          delete nextPositions[username];
        } else {
          const roomId = incomingPosition.room || DEFAULT_CHABLO_ROOM_ID;
          nextPositions[username] = {
            ...sanitizeNode(incomingPosition),
            ...normalizeRoomPosition(roomId, incomingPosition, getChabloRoomSpawnPosition(roomId))
          };
        }
        setAllPositions({ ...nextPositions });
      });
    } else {
      setAllPositions({});
    }

    return () => {
      positionMapNode?.off?.();
      positionsRoot?.off?.();
    };
  }, [gunApi]);

  useEffect(() => {
    const friendsNode = gunApi?.get?.('CHABLO_FRIENDS')?.get?.(currentUser);
    const friendMapNode = friendsNode?.map?.();
    const nextFriendMap = {};

    if (friendMapNode?.on) {
      friendMapNode.on((friendRecord, username) => {
        if (!friendRecord || typeof friendRecord !== 'object') {
          delete nextFriendMap[username];
        } else {
          nextFriendMap[username] = sanitizeNode(friendRecord);
        }
        setFriendEntries(normalizeFriendEntries(nextFriendMap));
      });
    } else {
      setFriendEntries([]);
    }

    return () => {
      friendMapNode?.off?.();
      friendsNode?.off?.();
    };
  }, [currentUser, gunApi]);

  useEffect(() => {
    const roomChatNode = gunApi?.get?.('CHABLO_ROOM_CHAT')?.get?.(currentRoom);
    const roomChatMapNode = roomChatNode?.map?.();
    const nextMessages = {};

    if (roomChatMapNode?.on) {
      roomChatMapNode.on((roomMessage, messageId) => {
        if (!roomMessage || typeof roomMessage !== 'object') {
          delete nextMessages[messageId];
        } else {
          nextMessages[messageId] = sanitizeNode(roomMessage);
        }
        setRoomMessages(normalizeRoomMessages(nextMessages));
      });
    } else {
      setRoomMessages([]);
    }

    return () => {
      roomChatMapNode?.off?.();
      roomChatNode?.off?.();
    };
  }, [currentRoom, gunApi]);

  useEffect(() => {
    const hotspotPresenceNode = gunApi?.get?.('CHABLO_HOTSPOT_PRESENCE')?.get?.(currentRoom);
    const hotspotPresenceMapNode = hotspotPresenceNode?.map?.();
    const nextPresenceMap = {};

    if (hotspotPresenceMapNode?.on) {
      hotspotPresenceMapNode.on((presenceEntry, username) => {
        if (!presenceEntry || typeof presenceEntry !== 'object') {
          delete nextPresenceMap[username];
        } else {
          nextPresenceMap[username] = sanitizeNode(presenceEntry);
        }
        setHotspotPresenceEntries(normalizeHotspotPresenceEntries(nextPresenceMap, currentUser));
      });
    } else {
      setHotspotPresenceEntries([]);
    }

    return () => {
      hotspotPresenceMapNode?.off?.();
      hotspotPresenceNode?.off?.();
    };
  }, [currentRoom, currentUser, gunApi]);

  useEffect(() => {
    const roomActivityNode = gunApi?.get?.('CHABLO_ROOM_ACTIVITY')?.get?.(currentRoom);
    const roomActivityMapNode = roomActivityNode?.map?.();
    const nextActivityMap = {};

    if (roomActivityMapNode?.on) {
      roomActivityMapNode.on((activityEntry, activityId) => {
        if (!activityEntry || typeof activityEntry !== 'object') {
          delete nextActivityMap[activityId];
        } else {
          nextActivityMap[activityId] = sanitizeNode(activityEntry);
        }
        setRoomActivityEntries(normalizeRoomActivityEntries(nextActivityMap));
      });
    } else {
      setRoomActivityEntries([]);
    }

    return () => {
      roomActivityMapNode?.off?.();
      roomActivityNode?.off?.();
    };
  }, [currentRoom, gunApi]);

  useEffect(() => {
    const roomStateNode = gunApi?.get?.('CHABLO_ROOM_STATE')?.get?.(currentRoom);
    const roomStateMapNode = roomStateNode?.map?.();
    const nextRoomStateMap = {};

    if (roomStateMapNode?.on) {
      roomStateMapNode.on((roomStateEntry, hotspotId) => {
        if (!roomStateEntry || typeof roomStateEntry !== 'object') {
          delete nextRoomStateMap[hotspotId];
        } else {
          nextRoomStateMap[hotspotId] = sanitizeNode(roomStateEntry);
        }
        setRoomStateEntries(normalizeRoomStateEntries(nextRoomStateMap));
      });
    } else {
      setRoomStateEntries([]);
    }

    return () => {
      roomStateMapNode?.off?.();
      roomStateNode?.off?.();
    };
  }, [currentRoom, gunApi]);

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

  const publishRoomActivity = useCallback((hotspot, actionType, summary) => {
    if (!hotspot || !summary) {
      return;
    }
    const timestamp = Date.now();
    const activityId = `${timestamp}-${currentUser}-${hotspot.id}`;
    gunApi?.get?.('CHABLO_ROOM_ACTIVITY')?.get?.(currentRoom)?.get?.(activityId)?.put?.({
      by: currentUser,
      room: currentRoom,
      hotspotId: hotspot.id,
      hotspotLabel: hotspot.label,
      actionType,
      summary,
      timestamp
    });
  }, [currentRoom, currentUser, gunApi]);

  const publishRoomState = useCallback((hotspot, actionType) => {
    if (!hotspot) {
      return;
    }
    const nextState = buildSharedRoomStatePayload(hotspot, actionType, currentUser);
    gunApi?.get?.('CHABLO_ROOM_STATE')?.get?.(currentRoom)?.get?.(hotspot.id)?.put?.({
      hotspotLabel: hotspot.label,
      title: nextState.title,
      text: nextState.text,
      detail: nextState.detail,
      by: currentUser,
      kind: nextState.kind,
      updatedAt: Date.now()
    });
  }, [currentRoom, currentUser, gunApi]);

  useEffect(() => {
    syncPosition(currentRoom, position);

    const heartbeat = window.setInterval(() => {
      syncPosition(currentRoom, position);
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [currentRoom, position, syncPosition]);

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
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(heartbeat);
    };
  }, [activeHotspot, clearHotspotPresence, currentRoom, syncHotspotPresence]);

  useEffect(() => () => {
    gunApi?.get?.('CHABLO_POSITION')?.get?.(currentUser)?.put?.({
      room: latestRoomRef.current,
      x: latestPositionRef.current.x,
      y: latestPositionRef.current.y,
      lastSeen: 0
    });
    clearHotspotPresence(publishedHotspotPresenceRef.current.roomId);
  }, [clearHotspotPresence, currentUser, gunApi]);

  useEffect(() => {
    if (selectedAvatar && !otherOccupants.find((occupant) => occupant.username === selectedAvatar)) {
      setSelectedAvatar(null);
    }
  }, [otherOccupants, selectedAvatar]);

  useEffect(() => {
    if (!activeHotspot) {
      return;
    }

    setSelectedHotspotId(activeHotspot.id);
    const nextFeedbackKey = `${currentRoom}:${activeHotspot.id}`;
    if (lastHotspotFeedbackRef.current !== nextFeedbackKey) {
      lastHotspotFeedbackRef.current = nextFeedbackKey;
      if (activeHotspot.feedback) {
        setFeedback(activeHotspot.feedback);
      }
    }
  }, [activeHotspot, currentRoom, setFeedback]);

  const applyRoomChange = useCallback((nextRoom, nextPosition) => {
    const normalizedRoom = getChabloRoom(nextRoom).id;
    if (normalizedRoom === currentRoom && !nextPosition) {
      return;
    }
    const normalizedPosition = normalizeRoomPosition(
      normalizedRoom,
      nextPosition || getChabloRoomSpawnPosition(normalizedRoom),
      getChabloRoomSpawnPosition(normalizedRoom)
    );
    if (
      normalizedRoom === currentRoom
      && normalizedPosition.x === position.x
      && normalizedPosition.y === position.y
    ) {
      return;
    }
    setCurrentRoom(normalizedRoom);
    setPosition(normalizedPosition);
    setSelectedAvatar(null);
    setSelectedHotspotId(null);
    setRoomActionState(null);
  }, [currentRoom, position.x, position.y]);

  const {
    beginDirectionalMove,
    endDirectionalMove,
    moveToTile,
    cancelMovement
  } = useChabloMovementController({
    currentRoom,
    position,
    setPosition,
    changeRoom: applyRoomChange
  });

  const changeRoom = useCallback((nextRoom, nextPosition) => {
    cancelMovement();
    applyRoomChange(nextRoom, nextPosition);
  }, [applyRoomChange, cancelMovement]);

  const focusRoomChatComposer = useCallback(() => {
    window.setTimeout(() => {
      const textarea = roomChatInputRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange?.(length, length);
    }, 0);
  }, []);

  const executeHotspotAction = useCallback((hotspot) => {
    if (!hotspot) {
      return;
    }

    const action = hotspot.action;
    if (!action?.type) {
      setActiveSidebarTab('hotspots');
      if (hotspot.feedback) {
        setFeedback(hotspot.feedback);
      }
      publishRoomState(hotspot, 'feedback');
      publishRoomActivity(hotspot, 'feedback', `${currentUser} hangt rond bij ${hotspot.label.toLowerCase()}.`);
      return;
    }

    if (action.type === 'bulletin') {
      setActiveSidebarTab('hotspots');
      setRoomActionState({
        kind: action.type,
        title: action.title || hotspot.label,
        text: action.text || hotspot.description || '',
        source: hotspot.label
      });
      setFeedback(action.message || hotspot.feedback || `${hotspot.label} geopend.`);
      publishRoomState(hotspot, action.type);
      publishRoomActivity(
        hotspot,
        action.type,
        `${currentUser} bekijkt ${hotspot.label.toLowerCase()}.`
      );
      return;
    }

    if (action.type === 'prefill-chat') {
      setActiveSidebarTab('chat');
      const nextText = action.text || '';
      setRoomChatInput(nextText);
      setRoomActionState({
        kind: action.type,
        title: action.title || hotspot.label,
        text: nextText,
        source: hotspot.label
      });
      focusRoomChatComposer();
      setFeedback(action.message || hotspot.feedback || `${hotspot.label} heeft iets klaargezet in de room chat.`);
      publishRoomState(hotspot, action.type);
      publishRoomActivity(
        hotspot,
        action.type,
        `${currentUser} zet een roomlijn klaar bij ${hotspot.label.toLowerCase()}.`
      );
      return;
    }

    if (action.type === 'room-jump' && action.roomId) {
      setActiveSidebarTab('hotspots');
      const jumpRoom = getChabloRoom(action.roomId).id;
      const jumpPosition = action.target || getChabloRoomSpawnPosition(jumpRoom);
      setRoomActionState({
        kind: action.type,
        title: action.title || hotspot.label,
        text: action.text || `Je springt door naar ${getChabloRoom(jumpRoom).name}.`,
        source: hotspot.label
      });
      setFeedback(action.message || `Je gaat naar ${getChabloRoom(jumpRoom).name}.`);
      publishRoomState(hotspot, action.type);
      publishRoomActivity(
        hotspot,
        action.type,
        `${currentUser} gebruikt ${hotspot.label.toLowerCase()} richting ${getChabloRoom(jumpRoom).name}.`
      );
      changeRoom(jumpRoom, jumpPosition);
      return;
    }

    setActiveSidebarTab('hotspots');
    setRoomActionState({
      kind: action.type,
      title: action.title || hotspot.label,
      text: action.text || hotspot.description || hotspot.feedback || '',
      source: hotspot.label
    });
    setFeedback(action.message || action.text || hotspot.feedback || `${hotspot.label} actief.`);
    publishRoomState(hotspot, action.type);
    publishRoomActivity(
      hotspot,
      action.type,
      `${currentUser} activeert ${hotspot.label.toLowerCase()}.`
    );
  }, [changeRoom, currentUser, focusRoomChatComposer, publishRoomActivity, publishRoomState, setFeedback]);

  const moveToHotspot = useCallback((hotspot) => {
    if (!hotspot) {
      return;
    }
    setSelectedAvatar(null);
    setSelectedHotspotId(hotspot.id);
    setRoomActionState(null);
    moveToTile(hotspot.target);
  }, [moveToTile]);

  const handleHotspotActivate = useCallback((hotspot) => {
    if (!hotspot) {
      return;
    }

    setActiveSidebarTab('hotspots');
    setSelectedAvatar(null);
    setSelectedHotspotId(hotspot.id);

    if (activeHotspot?.id === hotspot.id) {
      executeHotspotAction(hotspot);
      return;
    }

    moveToHotspot(hotspot);
  }, [activeHotspot?.id, executeHotspotAction, moveToHotspot]);

  const getHotspotButtonLabel = useCallback((hotspot, isActive) => {
    if (!isActive) {
      return hotspot.actionLabel || `Ga naar ${hotspot.label}`;
    }
    return hotspot.action?.buttonLabel || hotspot.actionLabel || `Gebruik ${hotspot.label}`;
  }, []);

  const getHotspotPresenceText = useCallback((hotspot) => {
    const visitors = hotspotPresenceById[hotspot.id] || [];
    if (!visitors.length) {
      return null;
    }
    if (visitors.length === 1) {
      return `Nu hier: ${visitors[0].username}`;
    }
    if (visitors.length === 2) {
      return `Nu hier: ${visitors[0].username} en ${visitors[1].username}`;
    }
    return `Nu hier: ${visitors[0].username}, ${visitors[1].username} +${visitors.length - 2}`;
  }, [hotspotPresenceById]);

  const getHotspotActivityText = useCallback((hotspot) => {
    const latestActivity = latestHotspotActivityById[hotspot.id];
    if (!latestActivity?.summary) {
      return null;
    }
    return `Laatste: ${latestActivity.summary}`;
  }, [latestHotspotActivityById]);

  const getHotspotStateText = useCallback((hotspot) => {
    const latestState = roomStateByHotspotId[hotspot.id];
    if (!latestState?.text) {
      return null;
    }
    return `Status: ${latestState.text}`;
  }, [roomStateByHotspotId]);

  const createDpadHandlers = useCallback((deltaX, deltaY) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      beginDirectionalMove(deltaX, deltaY);
    },
    onPointerUp: endDirectionalMove,
    onPointerLeave: endDirectionalMove,
    onPointerCancel: endDirectionalMove,
    onBlur: endDirectionalMove
  }), [beginDirectionalMove, endDirectionalMove]);

  const handleFriendRequest = useCallback((targetUsername) => {
    if (!targetUsername || targetUsername === currentUser) return;

    const existingEntry = friendEntries.find((entry) => entry.username === targetUsername);
    if (existingEntry?.status === 'accepted') {
      setFeedback(`${targetUsername} staat al in je motelvrienden.`);
      return;
    }

    const payload = {
      status: 'pending',
      since: Date.now(),
      metIn: currentRoom,
      initiator: currentUser
    };

    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(currentUser)?.get?.(targetUsername)?.put?.(payload);
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(targetUsername)?.get?.(currentUser)?.put?.(payload);
    setFeedback(`Vriendschapsverzoek gestuurd naar ${targetUsername}.`);
  }, [currentRoom, currentUser, friendEntries, gunApi, setFeedback]);

  const acceptFriendRequest = useCallback((friendUsername) => {
    const nextPayload = {
      status: 'accepted',
      since: Date.now(),
      metIn: currentRoom,
      initiator: currentUser
    };

    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(currentUser)?.get?.(friendUsername)?.put?.(nextPayload);
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(friendUsername)?.get?.(currentUser)?.put?.(nextPayload);
    setFeedback(`${friendUsername} is nu een Chablo-vriend.`);
  }, [currentRoom, currentUser, gunApi, setFeedback]);

  const rejectFriendRequest = useCallback((friendUsername) => {
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(currentUser)?.get?.(friendUsername)?.put?.(null);
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(friendUsername)?.get?.(currentUser)?.put?.(null);
    setFeedback(`Verzoek van ${friendUsername} geweigerd.`);
  }, [currentUser, gunApi, setFeedback]);

  const sendRoomMessage = useCallback((event) => {
    event.preventDefault();
    const trimmedMessage = roomChatInput.trim();
    if (!trimmedMessage) return;

    const timestamp = Date.now();
    gunApi?.get?.('CHABLO_ROOM_CHAT')?.get?.(currentRoom)?.get?.(String(timestamp))?.put?.({
      van: currentUser,
      tekst: trimmedMessage.slice(0, 100),
      timestamp
    });
    setRoomChatInput('');
  }, [currentRoom, currentUser, gunApi, roomChatInput]);

  const selectedAvatarPosition = otherOccupants.find((occupant) => occupant.username === selectedAvatar) || null;
  const showStageBootOverlay = stageEngineState === 'loading';
  const handleSelectAvatar = useCallback((username) => {
    setSelectedAvatar(username);
    setActiveSidebarTab('social');
  }, []);

  return (
    <div className="chablo-page">
      <div className="chablo-header">
        <div>
          <div className="chablo-wordmark">Chablo Motel</div>
          <div className="chablo-subtitle">
            Een lokale motelwereld met realtime avatars, aparte motelvrienden en rechtstreekse gesprekken.
          </div>
        </div>

        <div className="chablo-room-switcher" role="tablist" aria-label="Kies een kamer">
          {DEFAULT_CHABLO_ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`chablo-room-chip ${room.id === currentRoom ? 'chablo-room-chip--active' : ''}`}
              onClick={() => changeRoom(room.id)}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>

      <div className="chablo-layout">
        <section className="chablo-stage-shell">
          <div className="chablo-stage-topbar">
            <div>
              <h2>{currentRoomMeta.name}</h2>
              <p>{currentRoomMeta.description}</p>
            </div>
            <div className="chablo-stage-stats">
              <span>{position.x}, {position.y}</span>
              <strong>{otherOccupants.length + 1}</strong>
              <span>avatars in deze kamer</span>
            </div>
          </div>

          <div className="chablo-stage-actions">
            <div className="chablo-dpad" aria-label="Beweging">
              <button type="button" aria-label="Omhoog" {...createDpadHandlers(0, -1)}>{'\u25B2'}</button>
              <button type="button" aria-label="Links" {...createDpadHandlers(-1, 0)}>{'\u25C0'}</button>
              <button type="button" aria-label="Rechts" {...createDpadHandlers(1, 0)}>{'\u25B6'}</button>
              <button type="button" aria-label="Omlaag" {...createDpadHandlers(0, 1)}>{'\u25BC'}</button>
            </div>
            <div className="chablo-stage-hint">
              Gebruik pijltjes, houd de D-pad in, of klik op een tegel. Alles loopt nu aan dezelfde wandelsnelheid.
            </div>
          </div>

          <div className="chablo-stage-frame">
            {showStageBootOverlay && (
              <div className="chablo-boot-overlay" aria-live="polite">
                <div className="chablo-boot-overlay__card">
                  <div className="chablo-boot-overlay__eyebrow">Chablo Motel</div>
                  <strong>Hotel wordt klaargezet...</strong>
                  <p>De lobbylampen warmen op, de neon springt aan en de avatars druppelen binnen.</p>
                </div>
              </div>
            )}
            <ChabloPhaserStage
              activeHotspotId={highlightedHotspot?.id || null}
              currentRoomMeta={currentRoomMeta}
              currentUser={currentUser}
              onEngineStateChange={setStageEngineState}
              onDirectionStart={beginDirectionalMove}
              onDirectionStop={endDirectionalMove}
              onHotspotActivate={handleHotspotActivate}
              onTileActivate={moveToTile}
              onSelectAvatar={handleSelectAvatar}
              otherOccupants={otherOccupants}
              position={position}
              roomStateByHotspotId={roomStateByHotspotId}
              selectedAvatar={selectedAvatar}
            />
          </div>
        </section>

        <aside className="chablo-sidebar">
          {feedbackMessage && (
            <div className="chablo-feedback" role="status">{feedbackMessage}</div>
          )}

          {selectedAvatar && selectedAvatarPosition ? (
            <section className="chablo-card">
              <div className="chablo-card__title">Geselecteerde avatar</div>
              <div className="chablo-occupant-card">
                <strong>{selectedAvatar}</strong>
                <span>Kamer: {currentRoomMeta.name}</span>
                <span>Positie: {selectedAvatarPosition.x}, {selectedAvatarPosition.y}</span>
                {selectedFriendship?.status && (
                  <span className="chablo-pill">Status: {selectedFriendship.status}</span>
                )}
              </div>
              <div className="chablo-inline-actions">
                <button
                  type="button"
                  className="yoctol-btn"
                  onClick={() => onOpenConversation?.(selectedAvatar)}
                >
                  Stuur bericht
                </button>
                <button
                  type="button"
                  className="browser-secondary-btn"
                  onClick={() => handleFriendRequest(selectedAvatar)}
                >
                  Voeg toe als Chablo-vriend
                </button>
              </div>
            </section>
          ) : (
            <section className="chablo-card">
              <div className="chablo-card__title">Lobbykijker</div>
              <p>Klik op een avatar in de kamer om meteen een bericht te sturen of een motelvriendschap te starten.</p>
            </section>
          )}

          <div className="chablo-sidebar-tabs" role="tablist" aria-label="Chablo zijpanelen">
            {[
              { id: 'hotspots', label: 'Hotspots' },
              { id: 'activity', label: 'Activiteit' },
              { id: 'social', label: 'Sociaal' },
              { id: 'chat', label: 'Chat' }
            ].map((tab) => (
              <button
                key={tab.id}
                id={`chablo-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeSidebarTab === tab.id}
                aria-controls={`chablo-panel-${tab.id}`}
                className={`chablo-sidebar-tab ${activeSidebarTab === tab.id ? 'chablo-sidebar-tab--active' : ''}`}
                onClick={() => setActiveSidebarTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeSidebarTab === 'hotspots' && (
            <div
              id="chablo-panel-hotspots"
              role="tabpanel"
              aria-labelledby="chablo-tab-hotspots"
              className="chablo-sidebar-stack"
            >
              <section className="chablo-card">
                <div className="chablo-card__title">Room hotspots</div>
                {highlightedHotspot ? (
                  <div className="chablo-hotspot-feature">
                    <div className="chablo-hotspot-feature__label">
                      <span className="chablo-pill">{highlightedHotspot.kind}</span>
                      <strong>{highlightedHotspot.label}</strong>
                    </div>
                    {getHotspotPresenceText(highlightedHotspot) && (
                      <span className="chablo-hotspot-meta">{getHotspotPresenceText(highlightedHotspot)}</span>
                    )}
                    {getHotspotActivityText(highlightedHotspot) && (
                      <span className="chablo-hotspot-meta">{getHotspotActivityText(highlightedHotspot)}</span>
                    )}
                    {getHotspotStateText(highlightedHotspot) && (
                      <span className="chablo-hotspot-meta">{getHotspotStateText(highlightedHotspot)}</span>
                    )}
                    {highlightedHotspot.description && (
                      <p>{highlightedHotspot.description}</p>
                    )}
                    <div className="chablo-inline-actions">
                      <button
                        type="button"
                        className="yoctol-btn"
                        onClick={() => handleHotspotActivate(highlightedHotspot)}
                      >
                        {getHotspotButtonLabel(highlightedHotspot, activeHotspot?.id === highlightedHotspot.id)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>Klik op een gemarkeerde plek in de kamer om ernaartoe te wandelen en de room-interactie te openen.</p>
                )}

                {(currentRoomMeta.hotspots || []).length > 0 && (
                  <div className="chablo-hotspot-list">
                    {currentRoomMeta.hotspots.map((hotspot) => (
                      <div
                        key={hotspot.id}
                        className={`chablo-hotspot-row ${highlightedHotspot?.id === hotspot.id ? 'chablo-hotspot-row--active' : ''}`}
                      >
                        <div>
                          <strong>{hotspot.label}</strong>
                          {hotspot.description && <span>{hotspot.description}</span>}
                          {getHotspotPresenceText(hotspot) && (
                            <span className="chablo-hotspot-row__meta">{getHotspotPresenceText(hotspot)}</span>
                          )}
                          {getHotspotActivityText(hotspot) && (
                            <span className="chablo-hotspot-row__meta">{getHotspotActivityText(hotspot)}</span>
                          )}
                          {getHotspotStateText(hotspot) && (
                            <span className="chablo-hotspot-row__meta">{getHotspotStateText(hotspot)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="browser-secondary-btn"
                          onClick={() => (
                            activeHotspot?.id === hotspot.id
                              ? executeHotspotAction(hotspot)
                              : moveToHotspot(hotspot)
                          )}
                        >
                          {activeHotspot?.id === hotspot.id
                            ? getHotspotButtonLabel(hotspot, true)
                            : hotspot.actionLabel || 'Ga erheen'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {roomActionState && (
                <section className="chablo-card">
                  <div className="chablo-card__title">Hotspot actie</div>
                  <div className="chablo-hotspot-feature">
                    <div className="chablo-hotspot-feature__label">
                      <span className="chablo-pill">{roomActionState.kind}</span>
                      <strong>{roomActionState.title}</strong>
                    </div>
                    {roomActionState.source && (
                      <span>Bron: {roomActionState.source}</span>
                    )}
                    {roomActionState.text && (
                      <p>{roomActionState.text}</p>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeSidebarTab === 'activity' && (
            <div
              id="chablo-panel-activity"
              role="tabpanel"
              aria-labelledby="chablo-tab-activity"
              className="chablo-sidebar-stack"
            >
              <section className="chablo-card">
                <div className="chablo-card__title">Gedeelde room status</div>
                {roomStateEntries.length === 0 ? (
                  <p>Nog geen gedeelde roomstatus in deze kamer.</p>
                ) : (
                  <div className="chablo-room-activity-list">
                    {roomStateEntries.map((entry) => (
                      <article key={entry.hotspotId} className="chablo-room-activity-item">
                        <div className="chablo-room-activity-item__meta">
                          <strong>{entry.title}</strong>
                          <span>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString() : 'nu'}</span>
                        </div>
                        <p>{entry.text}</p>
                        {entry.detail && (
                          <span className="chablo-hotspot-row__meta">{entry.detail}</span>
                        )}
                        <span className="chablo-hotspot-row__meta">Door: {entry.by}</span>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="chablo-card">
                <div className="chablo-card__title">Live room activity</div>
                {roomActivityEntries.length === 0 ? (
                  <p>Nog geen gedeelde motelmomenten in deze kamer.</p>
                ) : (
                  <div className="chablo-room-activity-list">
                    {roomActivityEntries.map((entry) => (
                      <article key={entry.id} className="chablo-room-activity-item">
                        <div className="chablo-room-activity-item__meta">
                          <strong>{entry.hotspotLabel}</strong>
                          <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'nu'}</span>
                        </div>
                        <p>{entry.summary}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeSidebarTab === 'social' && (
            <div
              id="chablo-panel-social"
              role="tabpanel"
              aria-labelledby="chablo-tab-social"
              className="chablo-sidebar-stack"
            >
              <section className="chablo-card">
                <div className="chablo-card__title">Vriendschapsverzoeken</div>
                {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                  <p>Nog geen motelvriendschappen in beweging.</p>
                )}

                {incomingRequests.map((entry) => (
                  <div key={`incoming-${entry.username}`} className="chablo-request">
                    <div>
                      <strong>{entry.username}</strong>
                      <span>Wil je ontmoeten in {entry.metIn || 'het motel'}.</span>
                    </div>
                    <div className="chablo-inline-actions">
                      <button type="button" className="yoctol-btn" onClick={() => acceptFriendRequest(entry.username)}>
                        Accepteer
                      </button>
                      <button type="button" className="browser-secondary-btn" onClick={() => rejectFriendRequest(entry.username)}>
                        Weiger
                      </button>
                    </div>
                  </div>
                ))}

                {outgoingRequests.map((entry) => (
                  <div key={`outgoing-${entry.username}`} className="chablo-request chablo-request--pending">
                    <div>
                      <strong>{entry.username}</strong>
                      <span>Verzoek verstuurd vanuit {entry.metIn || currentRoomMeta.name}.</span>
                    </div>
                  </div>
                ))}
              </section>

              <section className="chablo-card">
                <div className="chablo-card__title">Chablo-vrienden</div>
                {acceptedFriends.length === 0 && (
                  <p>Je hebt nog geen geaccepteerde motelvrienden.</p>
                )}
                <div className="chablo-friends-list">
                  {acceptedFriends.map((entry) => {
                    const friendPosition = allPositions[entry.username];
                    const isOnline = isPositionFresh(friendPosition);
                    return (
                      <div key={entry.username} className="chablo-friend-row">
                        <div>
                          <strong>{entry.username}</strong>
                          <span>{isOnline ? `Online in ${friendPosition.room}` : 'Offline'}</span>
                        </div>
                        <button
                          type="button"
                          className="browser-secondary-btn"
                          disabled={!isOnline}
                          onClick={() => isOnline && changeRoom(friendPosition.room, friendPosition)}
                        >
                          Ga naar kamer
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {activeSidebarTab === 'chat' && (
            <div
              id="chablo-panel-chat"
              role="tabpanel"
              aria-labelledby="chablo-tab-chat"
              className="chablo-sidebar-stack"
            >
              <section className="chablo-card chablo-card--chat">
                <div className="chablo-card__title">Room chat</div>
                <form className="chablo-chat-form" onSubmit={sendRoomMessage}>
                  <textarea
                    ref={roomChatInputRef}
                    value={roomChatInput}
                    onChange={(event) => setRoomChatInput(event.target.value)}
                    rows={3}
                    maxLength={100}
                    placeholder={`Zeg iets in ${currentRoomMeta.name}`}
                  />
                  <button type="submit" className="yoctol-btn">Verzend naar kamer</button>
                </form>
                <div className="chablo-chat-log">
                  {roomMessages.length === 0 && (
                    <div className="chablo-chat-empty">Nog geen room talk. Jij kan de eerste awkward begroeting posten.</div>
                  )}
                  {roomMessages.map((message) => (
                    <article key={message.id} className="chablo-chat-message">
                      <div className="chablo-chat-message__meta">
                        <strong>{message.from}</strong>
                        <span>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'nu'}</span>
                      </div>
                      <p>{message.text}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ChabloMotelView;
