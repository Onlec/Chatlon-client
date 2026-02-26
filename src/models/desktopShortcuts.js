export function getGridPositionForIndex(index, gridConfig) {
  const {
    marginLeft,
    marginTop,
    cellWidth,
    cellHeight,
    bottomReserved,
    viewportHeight
  } = gridConfig;
  const usableHeight = Math.max(cellHeight, viewportHeight - bottomReserved - marginTop);
  const rows = Math.max(1, Math.floor(usableHeight / cellHeight));
  const column = Math.floor(index / rows);
  const row = index % rows;
  return {
    x: marginLeft + (column * cellWidth),
    y: marginTop + (row * cellHeight)
  };
}

export function buildDesktopShortcuts(paneConfig, gridConfig) {
  return Object.entries(paneConfig).map(([paneName, config], index) => ({
    id: paneName,
    paneName,
    label: config.desktopLabel,
    icon: config.desktopIcon,
    position: getGridPositionForIndex(index, gridConfig),
    order: index
  }));
}

export default buildDesktopShortcuts;
