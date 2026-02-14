// src/hooks/useTeamTalk.js
/**
 * TeamTalk Hook — Channel & User State
 * 
 * Beheert channels, user presence per channel, join/leave logica.
 * Gun.js backed met heartbeat-based presence.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { gun, user } from '../gun';
import { log } from '../utils/debug';

const CHANNEL_HEARTBEAT_INTERVAL = 5000;
const CHANNEL_PRESENCE_TIMEOUT = 12000;

const DEFAULT_CHANNELS = [
  { id: 'lobby', name: 'Lobby', order: 0 },
  { id: 'gaming', name: 'Gaming', order: 1 },
  { id: 'muziek', name: 'Muziek', order: 2 },
  { id: 'afk', name: 'AFK', order: 3 }
];

/**
 * Hook voor TeamTalk channel management.
 * 
 * @param {string} currentUser - Huidige username
 * @returns {Object} Channel state en functies
 */
export function useTeamTalk(currentUser) {
  const [channels, setChannels] = useState([]);
  const [channelUsers, setChannelUsers] = useState({});
  const [currentChannel, setCurrentChannel] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [currentHost, setCurrentHost] = useState(null);

  const heartbeatRef = useRef(null);
  const channelListenersRef = useRef(new Set());

  // ============================================
  // CHANNEL INITIALISATIE
  // ============================================

  const ensureDefaultChannels = useCallback(() => {
    DEFAULT_CHANNELS.forEach(ch => {
      gun.get('TEAMTALK').get('channels').get(ch.id).once((data) => {
        if (!data || !data.name) {
          gun.get('TEAMTALK').get('channels').get(ch.id).put({
            name: ch.name,
            type: 'permanent',
            hasPassword: false,
            createdBy: 'system',
            createdAt: Date.now(),
            order: ch.order
          });
          log('[useTeamTalk] Created default channel:', ch.name);
        }
      });
    });
  }, []);

  // ============================================
  // CHANNEL LISTENERS
  // ============================================

  const setupChannelListeners = useCallback(() => {
    log('[useTeamTalk] Setting up channel listeners');

    gun.get('TEAMTALK').get('channels').map().on((data, channelId) => {
      if (!data || !data.name) return;

      setChannels(prev => {
        const existing = prev.findIndex(c => c.id === channelId);
        const channel = {
          id: channelId,
          name: data.name,
          type: data.type || 'permanent',
          hasPassword: data.hasPassword || false,
          createdBy: data.createdBy,
          order: data.order || 99
        };

        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = channel;
          return updated.sort((a, b) => a.order - b.order);
        }
        return [...prev, channel].sort((a, b) => a.order - b.order);
      });

      // Setup user presence listener voor dit channel
      if (!channelListenersRef.current.has(channelId)) {
        channelListenersRef.current.add(channelId);
        setupChannelUserListener(channelId);
      }
    });
  }, []);
  // ============================================
  // HOST SELECTIE
  // ============================================

  const determineHost = useCallback((channelId) => {
    const users = channelUsers[channelId];
    if (!users || Object.keys(users).length === 0) {
      setCurrentHost(null);
      return;
    }

    // Oudste actieve user wordt host
    const sortedUsers = Object.values(users)
      .filter(u => u.heartbeat && (Date.now() - u.heartbeat < 12000))
      .sort((a, b) => a.joinedAt - b.joinedAt);

    const newHost = sortedUsers.length > 0 ? sortedUsers[0].username : null;

    setCurrentHost(prev => {
      if (prev !== newHost) {
        log('[useTeamTalk] Host changed:', prev, '→', newHost);
        // Publiceer host naar Gun zodat alle clients het weten
        if (newHost && currentUser === newHost) {
          gun.get('TEAMTALK').get('channels').get(channelId).get('host').put({
            username: newHost,
            since: Date.now()
          });
        }
      }
      return newHost;
    });
  }, [channelUsers, currentUser]);

  const setupChannelUserListener = useCallback((channelId) => {
    gun.get('TEAMTALK').get('channels').get(channelId).get('users').map().on((data, username) => {
      if (!data) return;

      const now = Date.now();
      const isAlive = data.heartbeat && (now - data.heartbeat < CHANNEL_PRESENCE_TIMEOUT);

      setChannelUsers(prev => {
        const channelState = { ...(prev[channelId] || {}) };

        if (isAlive) {
          channelState[username] = {
            username: data.username,
            joinedAt: data.joinedAt,
            isMuted: data.isMuted || false,
            isSpeaking: data.isSpeaking || false,
            heartbeat: data.heartbeat
          };
        } else {
          delete channelState[username];
        }

        return { ...prev, [channelId]: channelState };
      });
    });
  }, []);

  // ============================================
  // PRESENCE CLEANUP (verwijder stale users)
  // ============================================

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setChannelUsers(prev => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach(channelId => {
          const users = { ...updated[channelId] };
          Object.keys(users).forEach(username => {
            if (now - users[username].heartbeat > CHANNEL_PRESENCE_TIMEOUT) {
              delete users[username];
              changed = true;
            }
          });
          updated[channelId] = users;
        });

        return changed ? updated : prev;
      });
    }, CHANNEL_PRESENCE_TIMEOUT);

    return () => clearInterval(cleanupInterval);
  }, []);
  // Host selectie effect
  useEffect(() => {
    if (currentChannel) {
      determineHost(currentChannel);
    } else {
      setCurrentHost(null);
    }
  }, [currentChannel, channelUsers, determineHost]);

  // Luister naar host updates van Gun (voor niet-host peers)
  useEffect(() => {
    if (!currentChannel) return;

    const hostNode = gun.get('TEAMTALK').get('channels').get(currentChannel).get('host');
    hostNode.on((data) => {
      if (data && data.username) {
        setCurrentHost(data.username);
      }
    });

    return () => hostNode.off();
  }, [currentChannel]);
  // Host selectie effect
  useEffect(() => {
    if (currentChannel) {
      determineHost(currentChannel);
    } else {
      setCurrentHost(null);
    }
  }, [currentChannel, channelUsers, determineHost]);

  // Luister naar host updates van Gun (voor niet-host peers)
  useEffect(() => {
    if (!currentChannel) return;

    const hostNode = gun.get('TEAMTALK').get('channels').get(currentChannel).get('host');
    hostNode.on((data) => {
      if (data && data.username) {
        setCurrentHost(data.username);
      }
    });

    return () => hostNode.off();
  }, [currentChannel]);
  // ============================================
  // JOIN / LEAVE
  // ============================================

  const joinChannel = useCallback((channelId, password) => {
    if (!currentUser) return;

    // Wachtwoord check
    gun.get('TEAMTALK').get('channels').get(channelId).once((data) => {
      if (data && data.hasPassword && data.passwordHash) {
        if (!password || password !== data.passwordHash) {
          log('[useTeamTalk] Wrong password for channel:', channelId);
          return;
        }
      }

      // Leave huidig channel eerst
      if (currentChannel) {
        leaveChannel();
      }

      log('[useTeamTalk] Joining channel:', channelId);
      setCurrentChannel(channelId);

      const now = Date.now();
      gun.get('TEAMTALK').get('channels').get(channelId).get('users').get(currentUser).put({
        username: currentUser,
        joinedAt: now,
        isMuted: true,
        isSpeaking: false,
        heartbeat: now
      });

      // Start heartbeat
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        gun.get('TEAMTALK').get('channels').get(channelId).get('users').get(currentUser).put({
          username: currentUser,
          joinedAt: now,
          isMuted: isMuted,
          isSpeaking: false,
          heartbeat: Date.now()
        });
      }, CHANNEL_HEARTBEAT_INTERVAL);
    });
  }, [currentUser, currentChannel, isMuted]);

  const leaveChannel = useCallback(() => {
    if (!currentUser || !currentChannel) return;

    log('[useTeamTalk] Leaving channel:', currentChannel);

    // Stop heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    // Verwijder user uit channel
    gun.get('TEAMTALK').get('channels').get(currentChannel).get('users').get(currentUser).put({
      username: currentUser,
      heartbeat: 0
    });

    setCurrentChannel(null);
  }, [currentUser, currentChannel]);

  // ============================================
  // CHANNEL AANMAKEN
  // ============================================

  const createChannel = useCallback((name, password) => {
    if (!currentUser || !name.trim()) return;

    const channelId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    gun.get('TEAMTALK').get('channels').get(channelId).put({
      name: name.trim(),
      type: 'temporary',
      hasPassword: !!password,
      passwordHash: password || null,
      createdBy: currentUser,
      createdAt: Date.now(),
      order: 50
    });

    log('[useTeamTalk] Created channel:', name);
    return channelId;
  }, [currentUser]);

  // ============================================
  // MUTE TOGGLE
  // ============================================

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newVal = !prev;
      if (currentChannel && currentUser) {
        gun.get('TEAMTALK').get('channels').get(currentChannel).get('users').get(currentUser).get('isMuted').put(newVal);
      }
      return newVal;
    });
  }, [currentChannel, currentUser]);

  // ============================================
  // INIT & CLEANUP
  // ============================================

  useEffect(() => {
    if (!currentUser) return;

    ensureDefaultChannels();
    setupChannelListeners();

    return () => {
      leaveChannel();
    };
  }, [currentUser]);

  // Cleanup bij page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentChannel && currentUser) {
        gun.get('TEAMTALK').get('channels').get(currentChannel).get('users').get(currentUser).put({
          username: currentUser,
          heartbeat: 0
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentChannel, currentUser]);

  return {
    channels,
    channelUsers,
    currentChannel,
    currentHost,
    isHost: currentHost === currentUser,
    isMuted,
    joinChannel,
    leaveChannel,
    createChannel,
    toggleMute
  };
}

export default useTeamTalk;