import React, { useEffect, useRef, useState } from 'react';
import { createChabloPhaserBridge } from './createChabloPhaserBridge';

export function getStagePayload({
  activeHotspotId,
  currentRoomMeta,
  currentUser,
  otherOccupants,
  position,
  roomStateByHotspotId,
  selectedAvatar
}) {
  return {
    activeHotspotId,
    roomId: currentRoomMeta.id,
    roomAccent: currentRoomMeta.accent,
    currentUser,
    otherOccupants,
    position,
    roomStateByHotspotId,
    selectedAvatar
  };
}

export function ChabloPhaserStage({
  activeHotspotId,
  currentRoomMeta,
  currentUser,
  onEngineStateChange,
  onDirectionStart,
  onDirectionStop,
  onHotspotActivate,
  onTileActivate,
  onSelectAvatar,
  otherOccupants,
  position,
  roomStateByHotspotId,
  selectedAvatar
}) {
  const containerRef = useRef(null);
  const bridgeRef = useRef(null);
  const worldRef = useRef(null);
  const activeDirectionKeyRef = useRef(null);
  const onSelectAvatarRef = useRef(onSelectAvatar);
  const onTileActivateRef = useRef(onTileActivate);
  const onHotspotActivateRef = useRef(onHotspotActivate);
  const [engineState, setEngineState] = useState('loading');

  worldRef.current = getStagePayload({
    activeHotspotId,
    currentRoomMeta,
    currentUser,
    otherOccupants,
    position,
    roomStateByHotspotId,
    selectedAvatar
  });

  useEffect(() => {
    onSelectAvatarRef.current = onSelectAvatar;
    onTileActivateRef.current = onTileActivate;
    onHotspotActivateRef.current = onHotspotActivate;
  }, [onHotspotActivate, onSelectAvatar, onTileActivate]);

  useEffect(() => {
    onEngineStateChange?.(engineState);
  }, [engineState, onEngineStateChange]);

  useEffect(() => {
    let disposed = false;

    async function boot() {
      if (!containerRef.current) return;

      try {
        const phaserModule = await import('phaser');
        if (disposed || !containerRef.current) return;

        const PhaserRuntime = phaserModule.default || phaserModule;
        bridgeRef.current = createChabloPhaserBridge({
          Phaser: PhaserRuntime,
          container: containerRef.current,
          onInitialRender: () => {
            if (!disposed) {
              setEngineState('ready');
            }
          },
          onSelectAvatar: (username) => onSelectAvatarRef.current?.(username),
          onTileActivate: (tile) => onTileActivateRef.current?.(tile),
          onHotspotActivate: (hotspot) => onHotspotActivateRef.current?.(hotspot)
        });
        bridgeRef.current.updateWorld(worldRef.current);
      } catch (error) {
        if (disposed) return;
        setEngineState('error');
      }
    }

    boot();

    return () => {
      disposed = true;
      bridgeRef.current?.destroy?.();
      bridgeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!bridgeRef.current) return;
    bridgeRef.current.updateWorld(getStagePayload({
      activeHotspotId,
      currentRoomMeta,
      currentUser,
      otherOccupants,
      position,
      roomStateByHotspotId,
      selectedAvatar
    }));
  }, [activeHotspotId, currentRoomMeta, currentUser, otherOccupants, position, roomStateByHotspotId, selectedAvatar]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !bridgeRef.current) return undefined;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      bridgeRef.current?.resize?.(Math.max(320, Math.round(rect.width)), Math.max(240, Math.round(rect.height)));
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [engineState]);

  useEffect(() => () => {
    activeDirectionKeyRef.current = null;
    onDirectionStop?.();
  }, [onDirectionStop]);

  const directionByKey = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }
  };

  return (
    <div
      className="chablo-room-stage"
      tabIndex={0}
      role="application"
      aria-label={`Chablo Motel kamer ${currentRoomMeta.name}`}
      onMouseDown={(event) => event.currentTarget.focus()}
      onBlur={() => {
        activeDirectionKeyRef.current = null;
        onDirectionStop?.();
      }}
      onKeyDown={(event) => {
        const direction = directionByKey[event.key];
        if (direction) {
          event.preventDefault();
          if (event.repeat) {
            return;
          }
          activeDirectionKeyRef.current = event.key;
          onDirectionStart?.(direction.x, direction.y);
        }
      }}
      onKeyUp={(event) => {
        if (event.key === activeDirectionKeyRef.current) {
          activeDirectionKeyRef.current = null;
          onDirectionStop?.();
        }
      }}
    >
      <div ref={containerRef} className="chablo-phaser-mount" />
      {engineState === 'loading' && (
        <div className="chablo-stage-overlay">
          <div className="chablo-stage-overlay__card">Chablo Motel stage laden...</div>
        </div>
      )}
      {engineState === 'error' && (
        <div className="chablo-stage-overlay">
          <div className="chablo-stage-overlay__card">Phaser kon niet starten in deze pane.</div>
        </div>
      )}
    </div>
  );
}

export default ChabloPhaserStage;
