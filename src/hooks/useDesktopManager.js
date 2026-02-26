import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDesktopShortcuts, getGridPositionForIndex } from '../models/desktopShortcuts';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../utils/userPrefsGun';

const TASKBAR_HEIGHT = 30;

function getDesktopGridConfig() {
  return {
    marginLeft: 20,
    marginTop: 20,
    cellWidth: 96,
    cellHeight: 92,
    bottomReserved: TASKBAR_HEIGHT,
    itemWidth: 80,
    itemHeight: 72,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 720
  };
}

function snapToGrid(position, gridConfig) {
  const { marginLeft, marginTop, cellWidth, cellHeight, viewportWidth, viewportHeight, bottomReserved, itemWidth, itemHeight } = gridConfig;
  const snappedX = marginLeft + Math.round((position.x - marginLeft) / cellWidth) * cellWidth;
  const snappedY = marginTop + Math.round((position.y - marginTop) / cellHeight) * cellHeight;
  const minX = marginLeft;
  const minY = marginTop;
  const maxX = Math.max(minX, viewportWidth - itemWidth);
  const maxY = Math.max(minY, viewportHeight - bottomReserved - itemHeight);
  return {
    x: Math.min(maxX, Math.max(minX, snappedX)),
    y: Math.min(maxY, Math.max(minY, snappedY))
  };
}

function getGridBounds(gridConfig) {
  const { marginLeft, marginTop, cellWidth, cellHeight, viewportWidth, viewportHeight, bottomReserved, itemWidth, itemHeight } = gridConfig;
  const cols = Math.max(1, Math.floor((viewportWidth - marginLeft - itemWidth) / cellWidth) + 1);
  const rows = Math.max(1, Math.floor((viewportHeight - bottomReserved - marginTop - itemHeight) / cellHeight) + 1);
  return { cols, rows };
}

function positionToCell(position, gridConfig) {
  const { marginLeft, marginTop, cellWidth, cellHeight } = gridConfig;
  const { cols, rows } = getGridBounds(gridConfig);
  const col = Math.min(cols - 1, Math.max(0, Math.round((position.x - marginLeft) / cellWidth)));
  const row = Math.min(rows - 1, Math.max(0, Math.round((position.y - marginTop) / cellHeight)));
  return { col, row };
}

function cellToPosition(cell, gridConfig) {
  const { marginLeft, marginTop, cellWidth, cellHeight } = gridConfig;
  return {
    x: marginLeft + (cell.col * cellWidth),
    y: marginTop + (cell.row * cellHeight)
  };
}

function toCellKey(cell) {
  return `${cell.col}:${cell.row}`;
}

function findNearestAvailablePosition(targetPosition, occupiedSet, gridConfig) {
  const startCell = positionToCell(targetPosition, gridConfig);
  if (!occupiedSet.has(toCellKey(startCell))) {
    return cellToPosition(startCell, gridConfig);
  }
  const { cols, rows } = getGridBounds(gridConfig);
  const maxRadius = Math.max(cols, rows);
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dCol = -radius; dCol <= radius; dCol += 1) {
      for (let dRow = -radius; dRow <= radius; dRow += 1) {
        if (Math.abs(dCol) + Math.abs(dRow) !== radius) continue;
        const col = startCell.col + dCol;
        const row = startCell.row + dRow;
        if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const probe = { col, row };
        if (!occupiedSet.has(toCellKey(probe))) {
          return cellToPosition(probe, gridConfig);
        }
      }
    }
  }
  return targetPosition;
}

function computeInBoundsPositions(baseShortcuts, overrides, gridConfig) {
  const next = { ...overrides };
  const occupied = new Set();
  const visible = baseShortcuts.filter((shortcut) => !overrides[shortcut.id]?.hidden);
  visible.forEach((shortcut) => {
    const sourcePosition = overrides[shortcut.id]?.position || shortcut.position;
    const snapped = snapToGrid(sourcePosition, gridConfig);
    const resolved = findNearestAvailablePosition(snapped, occupied, gridConfig);
    const cell = positionToCell(resolved, gridConfig);
    occupied.add(toCellKey(cell));
    next[shortcut.id] = {
      ...(next[shortcut.id] || {}),
      position: resolved
    };
  });
  return next;
}

export function useDesktopManager({ paneConfig, onOpenPane, currentUser = 'guest' }) {
  const [desktopGridConfig, setDesktopGridConfig] = useState(() => getDesktopGridConfig());
  const userKey = currentUser || 'guest';
  const [isHydrating, setIsHydrating] = useState(true);
  const baseShortcuts = useMemo(
    () => buildDesktopShortcuts(paneConfig, desktopGridConfig),
    [paneConfig, desktopGridConfig]
  );
  const [shortcutOverrides, setShortcutOverrides] = useState({});

  useEffect(() => {
    let cancelled = false;
    setIsHydrating(true);
    (async () => {
      try {
        const loaded = await readUserPrefOnce(userKey, PREF_KEYS.DESKTOP_SHORTCUTS, {});
        if (cancelled) return;
        setShortcutOverrides(loaded && typeof loaded === 'object' ? loaded : {});
      } catch {
        if (cancelled) return;
        setShortcutOverrides({});
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  const persistOverrides = useCallback((overrides) => {
    if (isHydrating) return;
    void writeUserPref(userKey, PREF_KEYS.DESKTOP_SHORTCUTS, overrides || {});
  }, [userKey, isHydrating]);

  useEffect(() => {
    const handleResize = () => {
      setDesktopGridConfig(getDesktopGridConfig());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setShortcutOverrides((prev) => {
      const next = computeInBoundsPositions(baseShortcuts, prev, desktopGridConfig);
      persistOverrides(next);
      return next;
    });
  }, [desktopGridConfig, baseShortcuts, persistOverrides]);

  const shortcuts = useMemo(() => {
    return baseShortcuts
      .filter((shortcut) => !shortcutOverrides[shortcut.id]?.hidden)
      .map((shortcut) => ({
        ...shortcut,
        label: shortcutOverrides[shortcut.id]?.label || shortcut.label,
        position: shortcutOverrides[shortcut.id]?.position || shortcut.position
      }));
  }, [baseShortcuts, shortcutOverrides]);

  const openShortcut = useCallback((shortcutId) => {
    if (!shortcutId) return;
    onOpenPane(shortcutId);
  }, [onOpenPane]);

  const renameShortcut = useCallback((shortcutId, newLabel) => {
    const nextLabel = typeof newLabel === 'string' ? newLabel.trim() : '';
    if (!shortcutId || !nextLabel) return;
    setShortcutOverrides((prev) => {
      const next = {
        ...prev,
        [shortcutId]: {
          ...(prev[shortcutId] || {}),
          label: nextLabel
        }
      };
      persistOverrides(next);
      return next;
    });
  }, [persistOverrides]);

  const removeShortcut = useCallback((shortcutId) => {
    if (!shortcutId) return;
    setShortcutOverrides((prev) => {
      const next = {
        ...prev,
        [shortcutId]: {
          ...(prev[shortcutId] || {}),
          hidden: true
        }
      };
      persistOverrides(next);
      return next;
    });
  }, [persistOverrides]);

  const moveShortcut = useCallback((shortcutId, position) => {
    if (!shortcutId || !position) return;
    const snapped = snapToGrid(position, desktopGridConfig);
    setShortcutOverrides((prev) => {
      const occupiedSet = new Set();
      baseShortcuts.forEach((shortcut) => {
        if (shortcut.id === shortcutId) return;
        if (prev[shortcut.id]?.hidden) return;
        const currentPosition = prev[shortcut.id]?.position || shortcut.position;
        const cell = positionToCell(currentPosition, desktopGridConfig);
        occupiedSet.add(toCellKey(cell));
      });
      const resolved = findNearestAvailablePosition(snapped, occupiedSet, desktopGridConfig);
      const next = {
        ...prev,
        [shortcutId]: {
          ...(prev[shortcutId] || {}),
          position: resolved
        }
      };
      persistOverrides(next);
      return next;
    });
  }, [desktopGridConfig, baseShortcuts, persistOverrides]);

  const alignShortcutsToGrid = useCallback(() => {
    setShortcutOverrides((prev) => {
      const next = { ...prev };
      const visibleShortcuts = baseShortcuts.filter((shortcut) => !prev[shortcut.id]?.hidden);
      visibleShortcuts.forEach((shortcut, index) => {
        next[shortcut.id] = {
          ...(next[shortcut.id] || {}),
          position: getGridPositionForIndex(index, desktopGridConfig)
        };
      });
      persistOverrides(next);
      return next;
    });
  }, [baseShortcuts, desktopGridConfig, persistOverrides]);

  const getShortcutPosition = useCallback((shortcutId) => {
    const shortcut = shortcuts.find((item) => item.id === shortcutId);
    return shortcut?.position || null;
  }, [shortcuts]);

  const resetShortcuts = useCallback(() => {
    setShortcutOverrides({});
    persistOverrides({});
  }, [persistOverrides]);

  return {
    shortcuts,
    openShortcut,
    renameShortcut,
    removeShortcut,
    moveShortcut,
    alignShortcutsToGrid,
    getShortcutPosition,
    resetShortcuts,
    desktopGridConfig
  };
}

export default useDesktopManager;
