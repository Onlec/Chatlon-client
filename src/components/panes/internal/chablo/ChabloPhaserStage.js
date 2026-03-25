import React, { useEffect, useRef, useState } from 'react';
import { createChabloPhaserBridge } from './createChabloPhaserBridge';

function getStagePayload({
  currentRoomMeta,
  currentUser,
  otherOccupants,
  position,
  selectedAvatar
}) {
  return {
    roomId: currentRoomMeta.id,
    roomAccent: currentRoomMeta.accent,
    currentUser,
    otherOccupants,
    position,
    selectedAvatar
  };
}

export function ChabloPhaserStage({
  currentRoomMeta,
  currentUser,
  onDirectionStart,
  onDirectionStop,
  onTileActivate,
  onSelectAvatar,
  otherOccupants,
  position,
  selectedAvatar
}) {
  const containerRef = useRef(null);
  const bridgeRef = useRef(null);
  const worldRef = useRef(null);
  const activeDirectionKeyRef = useRef(null);
  const onSelectAvatarRef = useRef(onSelectAvatar);
  const onTileActivateRef = useRef(onTileActivate);
  const [engineState, setEngineState] = useState('loading');

  worldRef.current = getStagePayload({
    currentRoomMeta,
    currentUser,
    otherOccupants,
    position,
    selectedAvatar
  });

  useEffect(() => {
    onSelectAvatarRef.current = onSelectAvatar;
    onTileActivateRef.current = onTileActivate;
  }, [onSelectAvatar, onTileActivate]);

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
          onSelectAvatar: (username) => onSelectAvatarRef.current?.(username),
          onTileActivate: (tile) => onTileActivateRef.current?.(tile)
        });
        bridgeRef.current.updateWorld(worldRef.current);
        setEngineState('ready');
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
      currentRoomMeta,
      currentUser,
      otherOccupants,
      position,
      selectedAvatar
    }));
  }, [currentRoomMeta, currentUser, otherOccupants, position, selectedAvatar]);

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
