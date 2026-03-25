import { useCallback, useEffect, useRef } from 'react';
import { findRoomPath, resolveRoomMovement } from './movement';

export const STEP_INTERVAL_MS = 180;
export const STEP_TWEEN_MS = 140;

function directionFromPositions(fromPosition, toPosition) {
  return {
    x: toPosition.x - fromPosition.x,
    y: toPosition.y - fromPosition.y
  };
}

export function useChabloMovementController({
  currentRoom,
  position,
  setPosition,
  changeRoom
}) {
  const currentRoomRef = useRef(currentRoom);
  const positionRef = useRef(position);
  const timerRef = useRef(null);
  const routeQueueRef = useRef([]);
  const activeDirectionRef = useRef(null);
  const activeModeRef = useRef(null);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
    positionRef.current = position;
  }, [currentRoom, position]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelMovement = useCallback(() => {
    clearTimer();
    routeQueueRef.current = [];
    activeDirectionRef.current = null;
    activeModeRef.current = null;
  }, [clearTimer]);

  const commitPosition = useCallback((nextPosition) => {
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  }, [setPosition]);

  const commitRoomChange = useCallback((nextRoomId, nextPosition) => {
    currentRoomRef.current = nextRoomId;
    positionRef.current = nextPosition;
    changeRoom(nextRoomId, nextPosition);
  }, [changeRoom]);

  const stepDirectionalMove = useCallback((direction) => {
    const result = resolveRoomMovement(
      currentRoomRef.current,
      positionRef.current,
      direction.x,
      direction.y
    );

    if (result.door) {
      cancelMovement();
      commitRoomChange(result.door.nextRoomId, result.door.spawnPosition);
      return;
    }

    if (result.moved) {
      commitPosition(result.position);
    }
  }, [cancelMovement, commitPosition, commitRoomChange]);

  const runDirectionalStep = useCallback(() => {
    if (activeModeRef.current !== 'direction' || !activeDirectionRef.current) {
      return;
    }

    stepDirectionalMove(activeDirectionRef.current);
    timerRef.current = window.setTimeout(runDirectionalStep, STEP_INTERVAL_MS);
  }, [stepDirectionalMove]);

  const runRouteStep = useCallback(() => {
    if (activeModeRef.current !== 'route') {
      return;
    }

    const nextStep = routeQueueRef.current.shift();
    if (!nextStep) {
      cancelMovement();
      return;
    }

    const direction = directionFromPositions(positionRef.current, nextStep);
    const result = resolveRoomMovement(
      currentRoomRef.current,
      positionRef.current,
      direction.x,
      direction.y
    );

    if (result.door) {
      cancelMovement();
      commitRoomChange(result.door.nextRoomId, result.door.spawnPosition);
      return;
    }

    if (result.moved) {
      commitPosition(result.position);
    }

    if (!routeQueueRef.current.length) {
      cancelMovement();
      return;
    }

    timerRef.current = window.setTimeout(runRouteStep, STEP_INTERVAL_MS);
  }, [cancelMovement, commitPosition, commitRoomChange]);

  const beginDirectionalMove = useCallback((deltaX, deltaY) => {
    cancelMovement();
    activeModeRef.current = 'direction';
    activeDirectionRef.current = { x: deltaX, y: deltaY };
    stepDirectionalMove(activeDirectionRef.current);
    if (activeModeRef.current === 'direction') {
      timerRef.current = window.setTimeout(runDirectionalStep, STEP_INTERVAL_MS);
    }
  }, [cancelMovement, runDirectionalStep, stepDirectionalMove]);

  const endDirectionalMove = useCallback(() => {
    if (activeModeRef.current === 'direction') {
      cancelMovement();
    }
  }, [cancelMovement]);

  const moveToTile = useCallback((targetTile) => {
    const path = findRoomPath(currentRoomRef.current, positionRef.current, targetTile);
    if (!path.length) {
      return;
    }

    cancelMovement();
    activeModeRef.current = 'route';
    routeQueueRef.current = [...path];
    runRouteStep();
  }, [cancelMovement, runRouteStep]);

  useEffect(() => () => {
    clearTimer();
  }, [clearTimer]);

  return {
    beginDirectionalMove,
    endDirectionalMove,
    moveToTile,
    cancelMovement
  };
}

export default useChabloMovementController;
