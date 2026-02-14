// src/gun.js
/**
 * Centrale Gun instantie
 * 
 * Configuratie:
 * - Relay peer(s) voor server-backed sync
 * - Browser-to-browser peering via WebRTC
 * - SEA authenticatie
 * - Selectieve localStorage caching
 */

import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/webrtc';
import { log } from './utils/debug';

// Relay configuratie
const peers = [
  process.env.REACT_APP_GUN_URL,
  process.env.REACT_APP_GUN_URL_2
].filter(Boolean);

log('[Gun] Connecting to relay peers:', peers);
log('[Gun] WebRTC browser peering enabled');

// Centrale Gun instantie
// - peers: relay servers als fallback + discovery
// - localStorage: cache contacten, channels, profielen
// - WebRTC: direct browser-to-browser sync (via gun/lib/webrtc)
export const gun = Gun({
  peers,
  localStorage: true,
  rtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
});

export const user = gun.user().recall({ storage: true });

export default gun;