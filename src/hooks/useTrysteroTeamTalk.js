// src/hooks/useTrysteroTeamTalk.js
/**
 * TeamTalk via Trystero — Serverless voice channels
 * 
 * Gebruikt BitTorrent trackers voor peer discovery en
 * WebRTC voor audio streams. Geen eigen server nodig.
 * 
 * Verschil met useTeamTalkMesh.js:
 * - Geen Gun signaling (SDP/ICE)
 * - Geen handmatige RTCPeerConnection management
 * - Trystero doet alle WebRTC negotiation automatisch
 * - Room-based: join/leave is alles wat nodig is
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { joinRoom } from 'trystero/torrent';
import { gun, user } from '../gun';
import { log } from '../utils/debug';

const APP_ID = 'chatlon-tt-v1';

/**
 * @typedef {Object} ServerInfo
 * @property {string} id - Unieke server ID
 * @property {string} name - Servernaam
 * @property {string|null} password - Wachtwoord (optioneel)
 * @property {string} createdBy - Maker
 * @property {number} createdAt - Timestamp
 */

/**
 * Hook voor TeamTalk voice channels via Trystero.
 * 
 * @param {string} currentUser - Huidige username (of nickname)
 * @returns {Object} Server state en functies
 */
export function useTrysteroTeamTalk(currentUser) {
  // ============================================
  // STATE
  // ============================================
  const [isConnected, setIsConnected] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [peers, setPeers] = useState({});  // { peerId: { nickname, isMuted } }
  const [isMuted, setIsMuted] = useState(true);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const [recentServers, setRecentServers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);

  // ============================================
  // REFS
  // ============================================
  const roomRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudiosRef = useRef({});
  const sendNicknameRef = useRef(null);
  const getNicknameRef = useRef(null);
  const sendMuteStateRef = useRef(null);
  const getMuteStateRef = useRef(null);
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});
  const speakingIntervalRef = useRef(null);
  const peersRef = useRef({});
  const nicknameRef = useRef(currentUser);
  const isMutedRef = useRef(true);
  const serverInfoRef = useRef(null);

  useEffect(() => {
    serverInfoRef.current = serverInfo;
  }, [serverInfo]);
  // Update nickname ref wanneer currentUser verandert
  useEffect(() => {
    nicknameRef.current = currentUser;
  }, [currentUser]);

  // ============================================
  // LOAD RECENT SERVERS (localStorage)
  // ============================================
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatlon-tt-recent');
      if (saved) {
        setRecentServers(JSON.parse(saved));
      }
    } catch (e) {
      log('[TrysteroTT] Failed to load recent servers');
    }
  }, []);

  const saveRecentServer = useCallback((server) => {
    setRecentServers(prev => {
      const filtered = prev.filter(s => s.id !== server.id);
      const updated = [server, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('chatlon-tt-recent', JSON.stringify(updated));
      } catch (e) { /* ignore */ }
      return updated;
    });
  }, []);

  const removeRecentServer = useCallback((serverId) => {
    setRecentServers(prev => {
      const updated = prev.filter(s => s.id !== serverId);
      try {
        localStorage.setItem('chatlon-tt-recent', JSON.stringify(updated));
      } catch (e) { /* ignore */ }
      return updated;
    });
  }, []);
  /**
   * Zoek een server op ID of naam via Gun registry.
   * Returns Promise<ServerInfo|null>
   */
  const findServer = useCallback((query) => {
    return new Promise((resolve) => {
      const trimmed = query.trim();
      let found = false;

      // Eerst: check op exacte ID
      gun.get('TEAMTALK_SERVERS').get(trimmed).once((data) => {
        if (data && data.id && !found) {
          found = true;
          resolve(data);
          return;
        }

        // Als niet gevonden op ID, zoek op naam in recente servers
        const recentMatch = recentServers.find(
          s => s.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (recentMatch && !found) {
          found = true;
          resolve(recentMatch);
          return;
        }

        // Timeout: als Gun niets teruggeeft
        if (!found) {
          setTimeout(() => {
            if (!found) {
              found = true;
              resolve(null);
            }
          }, 2000);
        }
      });
    });
  }, [recentServers]);
  // ============================================
  // AUDIO MANAGEMENT
  // ============================================

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      localStreamRef.current = stream;
      // Start met track ENABLED — anders stuurt WebRTC geen data
      // Mute/unmute regelen we via de UI state, niet via track.enabled
      log('[TrysteroTT] Local stream acquired, tracks:', 
        stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`)
      );
      return stream;
    } catch (err) {
      log('[TrysteroTT] Microphone access denied:', err.message);
      setConnectionError('Microfoon toegang geweigerd');
      return null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  }, []);

  // ============================================
  // SPEAKING DETECTION
  // ============================================

  const setupSpeakingDetection = useCallback((nickname, stream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    analysersRef.current[nickname] = analyser;
  }, []);

  const startSpeakingMonitor = useCallback(() => {
    if (speakingIntervalRef.current) return;

    speakingIntervalRef.current = setInterval(() => {
      const speaking = new Set();
      const dataArray = new Uint8Array(256);

      Object.entries(analysersRef.current).forEach(([nickname, analyser]) => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        if (average > 15) speaking.add(nickname);
      });

      setSpeakingUsers(prev => {
        const prevArr = Array.from(prev).sort().join(',');
        const newArr = Array.from(speaking).sort().join(',');
        if (prevArr === newArr) return prev;
        return speaking;
      });
    }, 150);
  }, []);

  const stopSpeakingMonitor = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    analysersRef.current = {};
    setSpeakingUsers(new Set());
  }, []);

  // ============================================
  // SERVER MANAGEMENT
  // ============================================

  const generateServerId = useCallback(() => {
    return 'tt-' + Math.random().toString(36).substr(2, 6);
  }, []);

  /**
   * Maak een nieuwe server aan.
   */
  const createServer = useCallback((name, password = null) => {
    const id = generateServerId();
    const server = {
      id,
      name: name.trim(),
      password: password || null,
      createdBy: currentUser || 'Anoniem',
      createdAt: Date.now()
    };

    // Registreer in Gun zodat andere users de server kunnen vinden
    gun.get('TEAMTALK_SERVERS').get(id).put({
      id,
      name: name.trim(),
      hasPassword: !!password,
      createdBy: currentUser || 'Anoniem',
      createdAt: Date.now()
    });

    log('[TrysteroTT] Server created & registered:', server);
    saveRecentServer(server);

    // Auto-join na aanmaken
    connectToServer(id, password, currentUser || 'Host', name.trim());

    return server;
  }, [currentUser, generateServerId, saveRecentServer]);

  /**
   * Verbind met een server.
   */
  const connectToServer = useCallback(async (serverId, password = null, nickname = null, serverName = null) => {
    if (roomRef.current) {
      log('[TrysteroTT] Already connected, disconnecting first');
      disconnect();
    }

    const nick = nickname || currentUser || 'Anoniem';
    nicknameRef.current = nick;

    log('[TrysteroTT] Connecting to server:', serverId);
    setConnectionError(null);

    // Microfoon ophalen
    const stream = await getLocalStream();
    if (!stream) return;

    try {
      // Join Trystero room
      const roomConfig = {
        appId: APP_ID,
        ...(password && { password })
      };

      const room = joinRoom(roomConfig, serverId);
      roomRef.current = room;

      // Setup data actions voor nickname + mute state
      const [sendNickname, getNickname] = room.makeAction('nickname');
      const [sendMuteState, getMuteState] = room.makeAction('muteState');

      sendNicknameRef.current = sendNickname;
      getNicknameRef.current = getNickname;
      sendMuteStateRef.current = sendMuteState;
      getMuteStateRef.current = getMuteState;

      // Server naam delen zodat joiners de naam leren kennen
      const [sendServerName, getServerName] = room.makeAction('serverName');
      
      getServerName((name, peerId) => {
        log('[TrysteroTT] Received server name:', name);
        setServerInfo(prev => prev ? { ...prev, name } : prev);
      });

      // === PEER EVENTS ===

      room.onPeerJoin((peerId) => {
        log('[TrysteroTT] Peer joined:', peerId);
        
        // Stuur onze nickname naar de nieuwe peer
        sendNickname(nick, [peerId]);
        // Stuur onze mute state
        sendMuteState(isMutedRef.current, [peerId]);
        
        // Als wij de server kennen bij naam, deel die met de nieuwe peer
        if (serverInfoRef.current?.name && serverInfoRef.current.name !== serverInfoRef.current.id) {
          sendServerName(serverInfoRef.current.name, [peerId]);
        }

        // Stuur onze stream opnieuw naar de nieuwe peer
        if (localStreamRef.current) {
          log('[TrysteroTT] 📤 Re-sending stream to new peer:', peerId);
          room.addStream(localStreamRef.current, [peerId]);
        }

        peersRef.current[peerId] = { nickname: peerId, isMuted: false };
        setPeers(prev => ({
          ...prev,
          [peerId]: { nickname: peerId, isMuted: false }
        }));
      });

      room.onPeerLeave((peerId) => {
        log('[TrysteroTT] Peer left:', peerId);

        // Cleanup audio
        if (remoteAudiosRef.current[peerId]) {
          remoteAudiosRef.current[peerId].pause();
          remoteAudiosRef.current[peerId].srcObject = null;
          delete remoteAudiosRef.current[peerId];
        }

        // Cleanup speaking detection
        const peerNick = peersRef.current[peerId]?.nickname || peerId;
        delete analysersRef.current[peerNick];

        delete peersRef.current[peerId];
        setPeers(prev => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      });

      // === DATA EVENTS ===

      getNickname((nick, peerId) => {
        log('[TrysteroTT] Received nickname:', nick, 'from:', peerId);
        peersRef.current[peerId] = { 
          ...peersRef.current[peerId], 
          nickname: nick 
        };
        setPeers(prev => ({
          ...prev,
          [peerId]: { ...prev[peerId], nickname: nick }
        }));
      });

      getMuteState((muted, peerId) => {
        peersRef.current[peerId] = { 
          ...peersRef.current[peerId], 
          isMuted: muted 
        };
        setPeers(prev => ({
          ...prev,
          [peerId]: { ...prev[peerId], isMuted: muted }
        }));
      });

      // === AUDIO STREAMS ===

      room.onPeerStream((stream, peerId) => {
        log('[TrysteroTT] 🔈 Received stream from:', peerId);
        log('[TrysteroTT] Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));

        // Maak audio element
        if (!remoteAudiosRef.current[peerId]) {
          const audio = new Audio();
          audio.autoplay = true;
          audio.playsInline = true;
          remoteAudiosRef.current[peerId] = audio;
        }
        remoteAudiosRef.current[peerId].srcObject = stream;
        
        // Forceer play (autoplay policy workaround)
        remoteAudiosRef.current[peerId].play().then(() => {
          log('[TrysteroTT] ✅ Audio playing for:', peerId);
        }).catch(err => {
          log('[TrysteroTT] ❌ Audio play failed:', err.message);
        });

        // Speaking detection
        const peerNick = peersRef.current[peerId]?.nickname || peerId;
        setupSpeakingDetection(peerNick, stream);
      });

      // Stuur onze audio stream naar alle huidige EN toekomstige peers
      // Track moet ENABLED zijn bij addStream, anders stuurt WebRTC niets
      stream.getAudioTracks().forEach(track => { track.enabled = true; });
      log('[TrysteroTT] 📤 Adding local stream to room');
      room.addStream(stream);

      // Na een korte delay, dempen (zodat de stream eerst actief is)
      setTimeout(() => {
        stream.getAudioTracks().forEach(track => { track.enabled = false; });
        isMutedRef.current = true;
        log('[TrysteroTT] 🔇 Auto-muted after stream setup');
      }, 500);

      // Start speaking monitor
      startSpeakingMonitor();

      // Update state
      setIsConnected(true);

      // Update state
      setIsConnected(true);
      const displayName = serverName || serverId;
      setServerInfo({
        id: serverId,
        name: displayName,
        password
      });
      setIsMuted(true);

      // Sla op in recente servers
      saveRecentServer({
        id: serverId,
        name: displayName,
        password,
        createdBy: nickname || 'onbekend',
        createdAt: Date.now()
      });

      log('[TrysteroTT] Connected to server:', serverId);

    } catch (err) {
      log('[TrysteroTT] Connection error:', err.message);
      setConnectionError('Verbinding mislukt: ' + err.message);
      stopLocalStream();
    }
  }, [currentUser, getLocalStream, stopLocalStream, saveRecentServer, 
      setupSpeakingDetection, startSpeakingMonitor]);

  /**
   * Verbreek verbinding met huidige server.
   */
  const disconnect = useCallback(() => {
    log('[TrysteroTT] Disconnecting');

    // Leave Trystero room
    if (roomRef.current) {
      roomRef.current.leave();
      roomRef.current = null;
    }

    // Stop audio
    stopLocalStream();
    stopSpeakingMonitor();

    // Cleanup remote audios
    Object.values(remoteAudiosRef.current).forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    remoteAudiosRef.current = {};
    peersRef.current = {};

    // Reset state
    setIsConnected(false);
    setServerInfo(null);
    setPeers({});
    setIsMuted(true);
    setSpeakingUsers(new Set());
    setConnectionError(null);

    // Cleanup audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [stopLocalStream, stopSpeakingMonitor]);

  // ============================================
  // MUTE TOGGLE
  // ============================================

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        const newMuted = !isMuted;
        track.enabled = !newMuted;
        setIsMuted(newMuted);
        isMutedRef.current = newMuted;
        // Broadcast mute state naar alle peers
        if (sendMuteStateRef.current) {
          sendMuteStateRef.current(newMuted);
        }

        log('[TrysteroTT] Mute toggled:', newMuted);
      }
    }
  }, [isMuted]);

  // ============================================
  // VOLUME CONTROL
  // ============================================

  const setUserVolume = useCallback((peerId, volume) => {
    if (remoteAudiosRef.current[peerId]) {
      remoteAudiosRef.current[peerId].volume = volume / 100;
    }
  }, []);

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
      stopLocalStream();
      stopSpeakingMonitor();
      Object.values(remoteAudiosRef.current).forEach(audio => {
        audio.pause();
        audio.srcObject = null;
      });
    };
  }, []);

  // Cleanup bij page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomRef.current) {
        roomRef.current.leave();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    isConnected,
    serverInfo,
    peers,
    isMuted,
    speakingUsers,
    recentServers,
    connectionError,
    
    // Actions
    createServer,
    connectToServer,
    disconnect,
    toggleMute,
    setUserVolume,
    removeRecentServer,
    findServer,
    remoteAudiosRef
  };
}

export default useTrysteroTeamTalk;