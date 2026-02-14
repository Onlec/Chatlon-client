// src/hooks/useGroupCallMesh.js
/**
 * Herbruikte TeamTalk Mesh Hook — Supernode Patroon
 * 
 * De oudste user in een channel is de "supernode" (host).
 * Alle andere peers verbinden alleen met de host.
 * Host forwardt audio streams naar alle clients.
 * 
 * Fallback: als er maar 2 users zijn, directe P2P.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { gun } from '../gun';
import { log } from '../utils/debug';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

/**
 * @param {string} currentUser
 * @param {string|null} channelId
 * @param {Object} channelUsers - Users in het channel
 * @param {string|null} hostUsername - De huidige host
 * @param {boolean} isHost - Ben ik de host?
 */
export function useTeamTalkMesh(currentUser, channelId, channelUsers, hostUsername, isHost) {
  const [isMuted, setIsMuted] = useState(true);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const remoteAudiosRef = useRef({});
  const processedIceRef = useRef(new Set());
  const processedSignalsRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});
  const speakingIntervalRef = useRef(null);
  const mixedStreamsRef = useRef({});
  const mixDestinationsRef = useRef({});
  const previousHostRef = useRef(null);

  // ============================================
  // LOCAL STREAM
  // ============================================

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = false; });
      log('[TeamTalkMesh] Local stream acquired');
      return stream;
    } catch (err) {
      log('[TeamTalkMesh] Microphone access denied:', err.message);
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

  const setupSpeakingDetection = useCallback((username, stream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    analysersRef.current[username] = analyser;
  }, []);

  const startSpeakingMonitor = useCallback(() => {
    if (speakingIntervalRef.current) return;
    speakingIntervalRef.current = setInterval(() => {
      const speaking = new Set();
      const dataArray = new Uint8Array(256);
      Object.entries(analysersRef.current).forEach(([username, analyser]) => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        if (average > 15) speaking.add(username);
      });
      setSpeakingUsers(prev => {
        const prevArr = Array.from(prev).sort().join(',');
        const newArr = Array.from(speaking).sort().join(',');
        return prevArr === newArr ? prev : speaking;
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
  // HOST: AUDIO MIXING via Web Audio API
  // ============================================

  /**
   * Maakt een unieke mix voor elke client ZONDER hun eigen audio.
   * 
   * Client B krijgt: mix van [Host + C + D]
   * Client C krijgt: mix van [Host + B + D]
   * etc.
   */
  const createMixForClient = useCallback((targetUser) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    // Cleanup bestaande mix voor deze client
    if (mixDestinationsRef.current[targetUser]) {
      try {
        mixDestinationsRef.current[targetUser].disconnect();
      } catch (e) {}
      delete mixDestinationsRef.current[targetUser];
      delete mixedStreamsRef.current[targetUser];
    }

    const destination = ctx.createMediaStreamDestination();
    mixDestinationsRef.current[targetUser] = destination;
    mixedStreamsRef.current[targetUser] = destination.stream;

    // Voeg alle bronnen toe BEHALVE de target user
    // 1. Local stream (host's eigen audio)
    if (localStreamRef.current) {
      try {
        const localSource = ctx.createMediaStreamSource(localStreamRef.current);
        localSource.connect(destination);
      } catch (e) {
        log('[TeamTalkMesh] Mix: Error adding local stream:', e.message);
      }
    }

    // 2. Alle remote streams behalve targetUser
    Object.entries(remoteAudiosRef.current).forEach(([username, audioEl]) => {
      if (username === targetUser || !audioEl.srcObject) return;
      try {
        const source = ctx.createMediaStreamSource(audioEl.srcObject);
        source.connect(destination);
      } catch (e) {
        log('[TeamTalkMesh] Mix: Error adding remote stream from', username, ':', e.message);
      }
    });

    log('[TeamTalkMesh] HOST: Created mix for', targetUser);
    return destination.stream;
  }, []);

  /**
   * Rebuild alle mixen wanneer een peer erbij komt of weggaat.
   */
  const rebuildAllMixes = useCallback(() => {
    if (!isHost) return;

    const clients = Object.keys(peersRef.current);
    log('[TeamTalkMesh] HOST: Rebuilding mixes for', clients.length, 'clients');

    clients.forEach(clientUser => {
      const mixStream = createMixForClient(clientUser);
      const pc = peersRef.current[clientUser];
      if (!pc) return;

      // Vervang de tracks op de peer connection met de mix
      const senders = pc.getSenders();
      const mixTrack = mixStream.getAudioTracks()[0];

      if (!mixTrack) return;

      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      if (audioSender) {
        audioSender.replaceTrack(mixTrack)
          .then(() => log('[TeamTalkMesh] HOST: Replaced track for', clientUser))
          .catch(err => log('[TeamTalkMesh] HOST: ReplaceTrack error:', err.message));
      } else {
        try {
          pc.addTrack(mixTrack, mixStream);
          log('[TeamTalkMesh] HOST: Added mix track to', clientUser);
        } catch (err) {
          log('[TeamTalkMesh] HOST: AddTrack error:', err.message);
        }
      }
    });
  }, [isHost, createMixForClient]);

  /**
   * Cleanup alle mixen.
   */
  const cleanupMixes = useCallback(() => {
    Object.values(mixDestinationsRef.current).forEach(dest => {
      try { dest.disconnect(); } catch (e) {}
    });
    mixDestinationsRef.current = {};
    mixedStreamsRef.current = {};
  }, []);

  // ============================================
  // PEER CLEANUP
  // ============================================

  const removePeer = useCallback((remoteUser) => {
    log('[TeamTalkMesh] Removing peer:', remoteUser);
    if (peersRef.current[remoteUser]) {
      peersRef.current[remoteUser].close();
      delete peersRef.current[remoteUser];
    }
    if (remoteAudiosRef.current[remoteUser]) {
      remoteAudiosRef.current[remoteUser].srcObject = null;
      delete remoteAudiosRef.current[remoteUser];
    }
    delete analysersRef.current[remoteUser];
  }, []);

  const removeAllPeers = useCallback(() => {
    Object.keys(peersRef.current).forEach(removePeer);
    processedIceRef.current.clear();
    processedSignalsRef.current.clear();
    stopSpeakingMonitor();
  }, [removePeer, stopSpeakingMonitor]);

  // ============================================
  // HOST: FORWARD STREAMS
  // ============================================

  const forwardStreamToOtherClients = useCallback((sourceUser, stream) => {
    if (!isHost) return;

    log('[TeamTalkMesh] HOST: New stream from', sourceUser, '— rebuilding mixes');
    
    // Wacht kort zodat de stream volledig beschikbaar is
    setTimeout(() => {
      rebuildAllMixes();
    }, 200);
  }, [isHost, rebuildAllMixes]);

  
  // ============================================
  // PEER CONNECTION
  // ============================================

  const createPeerConnection = useCallback((remoteUser) => {
    if (peersRef.current[remoteUser]) {
      return peersRef.current[remoteUser];
    }

    log('[TeamTalkMesh] Creating peer connection to:', remoteUser, isHost ? '(I am host)' : '(I am client)');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelId) {
        const candidateId = `${currentUser}_${remoteUser}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        gun.get('TEAMTALK').get('signaling').get(channelId).get('ice').get(candidateId).put({
          candidate: JSON.stringify(event.candidate),
          from: currentUser,
          to: remoteUser,
          timestamp: Date.now()
        });
      }
    };

    pc.ontrack = (event) => {
      log('[TeamTalkMesh] Remote track from:', remoteUser);
      const stream = event.streams[0];

      if (!remoteAudiosRef.current[remoteUser]) {
        const audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current[remoteUser] = audio;
      }
      remoteAudiosRef.current[remoteUser].srcObject = stream;
      setupSpeakingDetection(remoteUser, stream);

      // HOST: wanneer een client stream binnenkomt, forward naar andere clients
      if (isHost) {
        forwardStreamToOtherClients(remoteUser, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      log('[TeamTalkMesh] Connection to', remoteUser, ':', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removePeer(remoteUser);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peersRef.current[remoteUser] = pc;
    return pc;
  }, [channelId, currentUser, isHost, setupSpeakingDetection, forwardStreamToOtherClients, removePeer]);


  // ============================================
  // SIGNALING
  // ============================================

  const sendOffer = useCallback(async (remoteUser) => {
    const pc = createPeerConnection(remoteUser);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const signalKey = `${currentUser}_${remoteUser}`;
      gun.get('TEAMTALK').get('signaling').get(channelId).get(signalKey).put({
        type: 'offer',
        sdp: JSON.stringify(offer),
        from: currentUser,
        to: remoteUser,
        timestamp: Date.now()
      });
      log('[TeamTalkMesh] Offer sent to:', remoteUser);
    } catch (err) {
      log('[TeamTalkMesh] Error creating offer:', err.message);
    }
  }, [channelId, currentUser, createPeerConnection]);

  const handleOffer = useCallback(async (fromUser, offerSdp) => {
    const pc = createPeerConnection(fromUser);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerSdp)));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const signalKey = `${fromUser}_${currentUser}`;
      gun.get('TEAMTALK').get('signaling').get(channelId).get(signalKey).put({
        type: 'answer',
        sdp: JSON.stringify(answer),
        from: currentUser,
        to: fromUser,
        timestamp: Date.now()
      });
      log('[TeamTalkMesh] Answer sent to:', fromUser);
    } catch (err) {
      log('[TeamTalkMesh] Error handling offer:', err.message);
    }
  }, [channelId, currentUser, createPeerConnection]);

  const handleAnswer = useCallback(async (fromUser, answerSdp) => {
    const pc = peersRef.current[fromUser];
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerSdp)));
      log('[TeamTalkMesh] Answer processed from:', fromUser);
    } catch (err) {
      log('[TeamTalkMesh] Error handling answer:', err.message);
    }
  }, []);

  // ============================================
  // MUTE TOGGLE
  // ============================================

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = isMuted;
        setIsMuted(!isMuted);
        if (channelId && currentUser) {
          gun.get('TEAMTALK').get('channels').get(channelId).get('users').get(currentUser).get('isMuted').put(!isMuted);
        }
        log('[TeamTalkMesh] Mute toggled:', !isMuted);
      }
    }
  }, [isMuted, channelId, currentUser]);

  // ============================================
  // SIGNALING LISTENER
  // ============================================

  useEffect(() => {
    if (!channelId || !currentUser) return;

    const signalingNode = gun.get('TEAMTALK').get('signaling').get(channelId);

    signalingNode.map().on((data, key) => {
      if (!data || !data.type || !data.sdp || data.to !== currentUser) return;
      if (data.timestamp && (Date.now() - data.timestamp > 30000)) return;

      // Dedup signalen
      const signalKey = `${data.type}_${data.from}_${data.timestamp}`;
      if (processedSignalsRef.current.has(signalKey)) return;
      processedSignalsRef.current.add(signalKey);

      if (data.type === 'offer' && data.from !== currentUser) {
        handleOffer(data.from, data.sdp);
      }
      if (data.type === 'answer' && data.from !== currentUser) {
        handleAnswer(data.from, data.sdp);
      }
    });

    signalingNode.get('ice').map().on((data, id) => {
      if (!data || !data.candidate || data.from === currentUser || data.to !== currentUser) return;
      if (processedIceRef.current.has(id)) return;
      processedIceRef.current.add(id);

      const pc = peersRef.current[data.from];
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate)))
          .catch(err => log('[TeamTalkMesh] ICE error:', err.message));
      }
    });

    return () => signalingNode.off();
  }, [channelId, currentUser, handleOffer, handleAnswer]);

  // ============================================
  // SUPERNODE CONNECTION LOGIC
  // ============================================

  useEffect(() => {
    if (!channelId || !currentUser || !hostUsername) return;

    const otherUsers = Object.keys(channelUsers || {}).filter(u => u !== currentUser);

    if (isHost) {
      // HOST: wacht op inkomende offers van clients
      // Stuur offers naar clients die nog geen verbinding hebben
      otherUsers.forEach(clientUser => {
        if (!peersRef.current[clientUser]) {
          log('[TeamTalkMesh] HOST: Initiating connection to client:', clientUser);
          sendOffer(clientUser);
        }
      });
    } else {
      // CLIENT: verbind alleen met host
      if (hostUsername && !peersRef.current[hostUsername]) {
        log('[TeamTalkMesh] CLIENT: Connecting to host:', hostUsername);
        sendOffer(hostUsername);
      }

      // Verwijder verbindingen met niet-host peers (migratie van mesh → supernode)
      Object.keys(peersRef.current).forEach(peer => {
        if (peer !== hostUsername) {
          log('[TeamTalkMesh] CLIENT: Removing non-host peer:', peer);
          removePeer(peer);
        }
      });
    }

    // Cleanup peers die niet meer in het channel zitten
    Object.keys(peersRef.current).forEach(peer => {
      if (!otherUsers.includes(peer)) {
        removePeer(peer);
      }
    });
  }, [channelId, currentUser, channelUsers, hostUsername, isHost, sendOffer, removePeer]);


  // ============================================
  // HOST MIGRATIE
  // ============================================

  useEffect(() => {
    if (!channelId || !currentUser || !hostUsername) return;

    // Detecteer host change
    if (previousHostRef.current && previousHostRef.current !== hostUsername) {
      log('[TeamTalkMesh] HOST MIGRATION detected:', previousHostRef.current, '→', hostUsername);

      // Sluit alle bestaande verbindingen
      removeAllPeers();
      cleanupMixes();
      processedSignalsRef.current.clear();
      processedIceRef.current.clear();

      // Wacht kort voor Gun sync, dan reconnect
      setTimeout(() => {
        if (isHost) {
          // Nieuwe host: wacht op inkomende connections
          const otherUsers = Object.keys(channelUsers || {}).filter(u => u !== currentUser);
          otherUsers.forEach(clientUser => {
            log('[TeamTalkMesh] NEW HOST: Sending offer to:', clientUser);
            sendOffer(clientUser);
          });
        } else {
          // Client: verbind met nieuwe host
          log('[TeamTalkMesh] CLIENT: Reconnecting to new host:', hostUsername);
          sendOffer(hostUsername);
        }
      }, 500);
    }

    previousHostRef.current = hostUsername;
  }, [hostUsername, channelId, currentUser, isHost, channelUsers, removeAllPeers, cleanupMixes, sendOffer]);

  // Rebuild mixes wanneer peers veranderen (host only)
  useEffect(() => {
    if (!isHost || !channelId) return;

    const peerCount = Object.keys(peersRef.current).length;
    if (peerCount > 0) {
      // Debounce rebuild
      const timer = setTimeout(() => {
        rebuildAllMixes();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isHost, channelId, channelUsers, rebuildAllMixes]);

  // Acquire stream + monitor on join, cleanup on leave
  useEffect(() => {
    if (channelId) {
      getLocalStream().then(() => startSpeakingMonitor());
    } else {
      removeAllPeers();
      cleanupMixes();
      stopLocalStream();
      previousHostRef.current = null;
    }
    return () => {
      removeAllPeers();
      cleanupMixes();
      stopLocalStream();
      previousHostRef.current = null;
    };
  }, [channelId]);
  
  return {
    isMuted,
    speakingUsers,
    toggleMute,
    peerCount: Object.keys(peersRef.current).length,
    remoteAudiosRef
  };
}

export default useTeamTalkMesh;