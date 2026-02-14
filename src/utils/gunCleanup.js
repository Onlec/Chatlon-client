// src/utils/gunCleanup.js
/**
 * Gun Data Compaction
 * 
 * Ruimt verlopen/orphaned data op bij login.
 * Voorkomt dat Gun nodes oneindig groeien.
 * 
 * Wordt aangeroepen vanuit App.js na succesvolle login.
 */

import { gun, user } from '../gun';
import { getContactPairId } from './chatUtils';
import { log } from './debug';

const SIGNALING_TTL = 60000;      // 60s — offers/answers/ICE
const PRESENCE_TTL = 30000;        // 30s — stale presence
const CALL_TTL = 60000;            // 60s — oude call signaling
const TEAMTALK_ICE_TTL = 60000;   // 60s — TeamTalk ICE candidates

/**
 * Cleanup verlopen signaling data voor 1-on-1 calls.
 */
function cleanupCallSignaling(currentUser, contacts) {
  let cleaned = 0;

  contacts.forEach(contactName => {
    const pairId = getContactPairId(currentUser, contactName);
    const callNode = gun.get('CALLS').get(pairId);

    callNode.once((data) => {
      if (!data) return;
      if (data.timestamp && (Date.now() - data.timestamp > CALL_TTL)) {
        callNode.put(null);
        cleaned++;
      }
    });

    // ICE candidates
    callNode.get('ice').map().once((data, key) => {
      if (!data) return;
      if (data.timestamp && (Date.now() - data.timestamp > SIGNALING_TTL)) {
        callNode.get('ice').get(key).put(null);
        cleaned++;
      }
    });
  });

  return cleaned;
}

/**
 * Cleanup verlopen TeamTalk signaling en ICE data.
 */
function cleanupTeamTalkSignaling() {
  let cleaned = 0;

  gun.get('TEAMTALK').get('signaling').map().once((channelData, channelId) => {
    if (!channelData) return;

    const signalingNode = gun.get('TEAMTALK').get('signaling').get(channelId);

    // Cleanup offers/answers
    signalingNode.map().once((data, key) => {
      if (!data || !data.timestamp) return;
      if (Date.now() - data.timestamp > SIGNALING_TTL) {
        signalingNode.get(key).put(null);
        cleaned++;
      }
    });

    // Cleanup ICE candidates
    signalingNode.get('ice').map().once((data, key) => {
      if (!data || !data.timestamp) return;
      if (Date.now() - data.timestamp > TEAMTALK_ICE_TTL) {
        signalingNode.get('ice').get(key).put(null);
        cleaned++;
      }
    });
  });

  return cleaned;
}

/**
 * Cleanup stale presence data van offline users.
 */
function cleanupStalePresence() {
  let cleaned = 0;

  gun.get('PRESENCE').map().once((data, username) => {
    if (!data) return;
    if (data.lastSeen && data.lastSeen > 0 && (Date.now() - data.lastSeen > PRESENCE_TTL) && data.status !== 'offline') {
      gun.get('PRESENCE').get(username).put({
        lastSeen: 0,
        status: 'offline',
        username: username
      });
      cleaned++;
    }
  });

  return cleaned;
}

/**
 * Cleanup verlopen TeamTalk channel user data (stale heartbeats).
 */
function cleanupTeamTalkPresence() {
  let cleaned = 0;

  gun.get('TEAMTALK').get('channels').map().once((channelData, channelId) => {
    if (!channelData) return;

    gun.get('TEAMTALK').get('channels').get(channelId).get('users').map().once((userData, username) => {
      if (!userData) return;
      if (userData.heartbeat && userData.heartbeat > 0 && (Date.now() - userData.heartbeat > PRESENCE_TTL)) {
        gun.get('TEAMTALK').get('channels').get(channelId).get('users').get(username).put({
          username: username,
          heartbeat: 0
        });
        cleaned++;
      }
    });
  });

  return cleaned;
}

/**
 * Cleanup verlopen ACTIVE_TAB data (gecrashte sessies).
 */
function cleanupActiveTabs() {
  let cleaned = 0;

  gun.get('ACTIVE_TAB').map().once((data, username) => {
    if (!data) return;
    if (data.heartbeat && data.heartbeat > 0 && (Date.now() - data.heartbeat > PRESENCE_TTL)) {
      gun.get('ACTIVE_TAB').get(username).put({
        tabId: null,
        heartbeat: 0
      });
      cleaned++;
    }
  });

  return cleaned;
}
/**
 * Cleanup stale superpeer registraties.
 */
function cleanupStaleSuperpeers() {
  let cleaned = 0;

  gun.get('SUPERPEERS').map().once((data, username) => {
    if (!data) return;
    if (data.heartbeat && data.heartbeat > 0 && (Date.now() - data.heartbeat > PRESENCE_TTL)) {
      gun.get('SUPERPEERS').get(username).put({
        available: false,
        heartbeat: 0,
        username: username
      });
      cleaned++;
    }
  });

  return cleaned;
}
/**
 * Voer alle cleanup taken uit.
 * Wordt aangeroepen vanuit App.js na login.
 * 
 * @param {string} currentUser - Huidige username
 */
export function runFullCleanup(currentUser) {
  log('[GunCleanup] Starting full cleanup for:', currentUser);

  // Haal contactenlijst op voor call cleanup
  const contacts = [];

  user.get('contacts').map().once((data) => {
    if (data && data.status === 'accepted' && data.username) {
      contacts.push(data.username);
    }
  });

  // Wacht kort zodat contacts geladen zijn, dan cleanup
  setTimeout(() => {
    const results = {
      callSignaling: cleanupCallSignaling(currentUser, contacts),
      teamTalkSignaling: cleanupTeamTalkSignaling(),
      stalePresence: cleanupStalePresence(),
      teamTalkPresence: cleanupTeamTalkPresence(),
      activeTabs: cleanupActiveTabs(),
      staleSuperpeers: cleanupStaleSuperpeers()
    };

    log('[GunCleanup] Cleanup complete:', results);
  }, 2000);
}

export default runFullCleanup;