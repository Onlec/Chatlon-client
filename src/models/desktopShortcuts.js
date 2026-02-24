export function buildDesktopShortcuts(paneConfig) {
  return Object.entries(paneConfig).map(([paneName, config], index) => ({
    id: paneName,
    paneName,
    label: config.desktopLabel,
    icon: config.desktopIcon,
    // Placeholder for upcoming grid/drag features
    position: null,
    order: index
  }));
}

export default buildDesktopShortcuts;
