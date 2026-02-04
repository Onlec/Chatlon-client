/**
 * Presence Utilities
 * 
 * Bevat constanten en functies voor presence/status management.
 * Gebruikt door App.js (logica) en ContactsPane.js (UI).
 */

// ============================================
// TIMING CONSTANTEN
// ============================================

/** Interval voor heartbeat updates (20 seconden) */
export const PRESENCE_HEARTBEAT_INTERVAL = 20000;

/** Timeout voordat user als offline wordt beschouwd (60 seconden) */
export const PRESENCE_TIMEOUT = 60000;

/** Timeout voor auto-away status bij inactiviteit (5 minuten) */
export const AUTO_AWAY_TIMEOUT = 300000;

// ============================================
// STATUS OPTIES
// ============================================

/**
 * Alle beschikbare status opties met value, label en kleur.
 * Gebruikt voor dropdown selectors en status weergave.
 */
export const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#7AC142' },
  { value: 'away', label: 'Afwezig', color: '#FFB900' },
  { value: 'busy', label: 'Bezet', color: '#E74856' },
  { value: 'appear-offline', label: 'Offline weergeven', color: '#8C8C8C' }
];

/**
 * Lookup object voor status labels.
 * @example STATUS_LABELS['online'] // 'Online'
 */
export const STATUS_LABELS = STATUS_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {});

/**
 * Lookup object voor status kleuren.
 * @example STATUS_COLORS['online'] // '#7AC142'
 */
export const STATUS_COLORS = STATUS_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.color;
  return acc;
}, {});

// ============================================
// FUNCTIES
// ============================================

/**
 * Bepaalt de presence status van een contact op basis van presence data.
 * 
 * @param {Object|null} presence - Presence data object van Gun
 * @param {number} presence.lastSeen - Unix timestamp van laatste heartbeat
 * @param {string} presence.status - Handmatig ingestelde status
 * @returns {Object} Status object met value, label en color
 * 
 * @example
 * const status = getPresenceStatus({ lastSeen: Date.now(), status: 'online' });
 * // { value: 'online', label: 'Online', color: '#7AC142' }
 */
export function getPresenceStatus(presence) {
  // Geen presence data = offline
  if (!presence || !presence.lastSeen) {
    return {
      value: 'offline',
      label: 'Offline',
      color: '#8C8C8C'
    };
  }

  const now = Date.now();
  const timeSinceLastSeen = now - presence.lastSeen;

  // Te lang geleden = offline
  if (timeSinceLastSeen > PRESENCE_TIMEOUT) {
    return {
      value: 'offline',
      label: 'Offline',
      color: '#8C8C8C'
    };
  }

  // Gebruiker heeft specifieke status ingesteld
  if (presence.status && presence.status !== 'online') {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === presence.status);
    if (statusOption) {
      return { ...statusOption };
    }
  }

  // Auto-away na inactiviteit (alleen als status 'online' is)
  if (presence.lastActivity && (now - presence.lastActivity > AUTO_AWAY_TIMEOUT)) {
    return {
      value: 'away',
      label: 'Afwezig',
      color: '#FFB900'
    };
  }

  // Default = online
  return {
    value: 'online',
    label: 'Online',
    color: '#7AC142'
  };
}

/**
 * Haalt alleen het label op voor een presence status.
 * Convenience functie voor simpele UI weergave.
 * 
 * @param {Object|null} presence - Presence data object van Gun
 * @returns {string} Status label (bijv. 'Online', 'Afwezig', 'Offline')
 */
export function getPresenceLabel(presence) {
  return getPresenceStatus(presence).label;
}

/**
 * Haalt alleen de kleur op voor een presence status.
 * Convenience functie voor simpele UI weergave.
 * 
 * @param {Object|null} presence - Presence data object van Gun
 * @returns {string} Hex kleurcode
 */
export function getPresenceColor(presence) {
  return getPresenceStatus(presence).color;
}

/**
 * Controleert of een contact online is.
 * 
 * @param {Object|null} presence - Presence data object van Gun
 * @returns {boolean} true als contact online is (niet offline)
 */
export function isOnline(presence) {
  const status = getPresenceStatus(presence);
  return status.value !== 'offline';
}

export default {
  PRESENCE_HEARTBEAT_INTERVAL,
  PRESENCE_TIMEOUT,
  AUTO_AWAY_TIMEOUT,
  STATUS_OPTIONS,
  STATUS_LABELS,
  STATUS_COLORS,
  getPresenceStatus,
  getPresenceLabel,
  getPresenceColor,
  isOnline
};