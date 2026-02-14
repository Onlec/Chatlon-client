// src/utils/relayMonitor.js
/**
 * Relay Health Monitor
 * 
 * Periodiek checkt of relay peers bereikbaar zijn.
 * Reconnect automatisch wanneer een relay terugkomt.
 * 
 * Probleem: Gun.js probeert NIET opnieuw te verbinden
 * met relays die offline waren bij initialisatie.
 * 
 * Oplossing: polling + handmatige reconnect via gun.opt()
 */

import { gun } from '../gun';
import { log } from './debug';

const HEALTH_CHECK_INTERVAL = 30000;  // 30s
const RELAY_TIMEOUT = 5000;           // 5s timeout per check

let monitorInterval = null;
let relayStatus = {};  // { url: 'online'|'offline' }
let statusCallbacks = [];

/**
 * Check of een relay bereikbaar is via fetch.
 * Gun relays antwoorden op HTTP GET met een Gun header.
 */
async function checkRelay(url) {
  try {
    // Gun relay URL eindigt op /gun — strip dat voor de health check
    const baseUrl = url.replace(/\/gun\/?$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RELAY_TIMEOUT);

    const response = await fetch(baseUrl, {
      method: 'HEAD',
      mode: 'no-cors',  // Geen CORS header nodig, we checken alleen bereikbaarheid
      signal: controller.signal
    });

    clearTimeout(timeout);
    return true;  // no-cors geeft altijd opaque response, maar geen error = bereikbaar
  } catch (err) {
    return false;
  }
}

/**
 * Reconnect Gun met een relay die terug online is.
 */
function reconnectRelay(url) {
  log('[RelayMonitor] Reconnecting to relay:', url);

  // Gun.opt() voegt peers toe of reconnect bestaande
  gun.opt({ peers: [url] });
}

/**
 * Voer health check uit voor alle bekende relays.
 */
async function runHealthCheck() {
  const peers = [
    process.env.REACT_APP_GUN_URL,
    process.env.REACT_APP_GUN_URL_2
  ].filter(Boolean);

  for (const url of peers) {
    const wasOnline = relayStatus[url] === 'online';
    const isOnline = await checkRelay(url);

    if (isOnline && !wasOnline) {
      log('[RelayMonitor] Relay came back online:', url);
      reconnectRelay(url);
    } else if (!isOnline && wasOnline) {
      log('[RelayMonitor] Relay went offline:', url);
    }

    const newStatus = isOnline ? 'online' : 'offline';
    if (relayStatus[url] !== newStatus) {
      relayStatus[url] = newStatus;
      notifyStatusChange();
    }
  }
}

/**
 * Notificeer alle listeners van status verandering.
 */
function notifyStatusChange() {
  const summary = {
    relays: { ...relayStatus },
    anyOnline: Object.values(relayStatus).some(s => s === 'online'),
    allOnline: Object.values(relayStatus).every(s => s === 'online')
  };
  statusCallbacks.forEach(cb => cb(summary));
}

/**
 * Start de relay monitor.
 */
export function startRelayMonitor() {
  if (monitorInterval) return;

  log('[RelayMonitor] Starting relay health monitor');

  // Initiële check
  runHealthCheck();

  // Periodieke check
  monitorInterval = setInterval(runHealthCheck, HEALTH_CHECK_INTERVAL);
}

/**
 * Stop de relay monitor.
 */
export function stopRelayMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  relayStatus = {};
  statusCallbacks = [];
  log('[RelayMonitor] Stopped');
}

/**
 * Registreer een callback voor status updates.
 * 
 * @param {Function} callback - Ontvangt { relays, anyOnline, allOnline }
 * @returns {Function} Unsubscribe functie
 */
export function onRelayStatusChange(callback) {
  statusCallbacks.push(callback);

  // Stuur direct huidige status
  if (Object.keys(relayStatus).length > 0) {
    callback({
      relays: { ...relayStatus },
      anyOnline: Object.values(relayStatus).some(s => s === 'online'),
      allOnline: Object.values(relayStatus).every(s => s === 'online')
    });
  }

  return () => {
    statusCallbacks = statusCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Forceer een onmiddellijke health check + reconnect.
 */
export function forceReconnect() {
  log('[RelayMonitor] Force reconnect triggered');
  runHealthCheck();
}

export default {
  startRelayMonitor,
  stopRelayMonitor,
  onRelayStatusChange,
  forceReconnect
};