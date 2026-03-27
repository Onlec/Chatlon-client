import { useEffect, useMemo, useRef, useState } from 'react';
import { getHotspotAtPosition } from './movement';

export function useChabloHotspotState({
  currentRoom,
  currentRoomMeta,
  position,
  setFeedback
}) {
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [roomActionState, setRoomActionState] = useState(null);
  const [wardrobeDraftAppearance, setWardrobeDraftAppearance] = useState(null);
  const lastHotspotFeedbackRef = useRef('');

  const activeHotspot = useMemo(
    () => getHotspotAtPosition(currentRoom, position),
    [currentRoom, position]
  );

  const selectedHotspot = useMemo(
    () => currentRoomMeta.hotspots?.find((hotspot) => hotspot.id === selectedHotspotId) || null,
    [currentRoomMeta.hotspots, selectedHotspotId]
  );

  const highlightedHotspot = selectedHotspot || activeHotspot || null;

  useEffect(() => {
    if (roomActionState?.kind !== 'wardrobe') {
      setWardrobeDraftAppearance(null);
    }
  }, [roomActionState?.kind]);

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

  return {
    activeHotspot,
    highlightedHotspot,
    roomActionState,
    selectedHotspot,
    selectedHotspotId,
    setRoomActionState,
    setSelectedHotspotId,
    setWardrobeDraftAppearance,
    wardrobeDraftAppearance
  };
}

export default useChabloHotspotState;
