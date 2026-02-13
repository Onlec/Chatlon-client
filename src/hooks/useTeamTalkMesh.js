// src/hooks/useTeamTalkMesh.js
/**
 * TeamTalk Mesh Hook — WebRTC multi-peer audio
 * 
 * Beheert mesh van RTCPeerConnections binnen een channel.
 * Elke peer verbindt met elke andere peer (N-1 connections).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { gun } from '../gun';
import { log } from '../utils/debug';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

/**
 * Hook voor WebRTC mesh audio in een TeamTalk channel.
 * 
 * @param {string} currentUser - Huidige username
 * @param {string|null} channelId - Huidig channel ID
 * @param {Object} channelUsers - Users in het channel
 * @returns {Object} Mesh state en functies
 */
export function useTeamTalkMesh(currentUser, channelId, channelUsers) {
  const [isMuted, setIsMuted] = useState(true);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const remoteAudiosRef = useRef({});
  const processedIceRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const analysersRef = useRef({});
  const speakingIntervalRef = useRef(null);

  // ============================================
  // LOCAL STREAM
  // ============================================

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      // Start gedempt
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

    const ctx = audioContextRef.current;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
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
        if (average > 15) {
          speaking.add(username);
        }
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
  // PEER CONNECTION MANAGEMENT
  // ============================================

  const createPeerConnection = useCallback((remoteUser) => {
    if (peersRef.current[remoteUser]) {
      log('[TeamTalkMesh] Peer already exists for:', remoteUser);
      return peersRef.current[remoteUser];
    }

    log('[TeamTalkMesh] Creating peer connection to:', remoteUser);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // ICE candidates
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

    // Remote stream
    pc.ontrack = (event) => {
      log('[TeamTalkMesh] Remote track from:', remoteUser);
      const stream = event.streams[0];

      // Audio element
      if (!remoteAudiosRef.current[remoteUser]) {
        const audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current[remoteUser] = audio;
      }
      remoteAudiosRef.current[remoteUser].srcObject = stream;

      // Speaking detection
      setupSpeakingDetection(remoteUser, stream);
    };

    pc.onconnectionstatechange = () => {
      log('[TeamTalkMesh] Connection to', remoteUser, ':', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removePeer(remoteUser);
      }
    };

    // Voeg local tracks toe
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peersRef.current[remoteUser] = pc;
    return pc;
  }, [channelId, currentUser, setupSpeakingDetection]);

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
    stopSpeakingMonitor();
  }, [removePeer, stopSpeakingMonitor]);

  // ============================================
  // SIGNALING
  // ============================================

  const sendOffer = useCallback(async (remoteUser) => {
    const pc = createPeerConnection(remoteUser);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      gun.get('TEAMTALK').get('signaling').get(channelId).get(`${currentUser}_${remoteUser}`).put({
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

      gun.get('TEAMTALK').get('signaling').get(channelId).get(`${fromUser}_${currentUser}`).put({
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
        track.enabled = isMuted; // was muted, now unmute (and vice versa)
        setIsMuted(!isMuted);

        // Update Gun presence
        if (channelId && currentUser) {
          gun.get('TEAMTALK').get('channels').get(channelId).get('users').get(currentUser).get('isMuted').put(!isMuted);
        }

        log('[TeamTalkMesh] Mute toggled:', !isMuted);
      }
    }
  }, [isMuted, channelId, currentUser]);

  // ============================================
  // CHANNEL JOIN/LEAVE EFFECTS
  // ============================================

  // Signaling listener
  useEffect(() => {
    if (!channelId || !currentUser) return;

    const signalingNode = gun.get('TEAMTALK').get('signaling').get(channelId);

    // Luister naar offers/answers gericht aan ons
    signalingNode.map().on((data, key) => {
      if (!data || !data.type || !data.sdp || data.to !== currentUser) return;
      if (data.timestamp && (Date.now() - data.timestamp > 30000)) return;

      if (data.type === 'offer' && data.from !== currentUser) {
        handleOffer(data.from, data.sdp);
      }
      if (data.type === 'answer' && data.from !== currentUser) {
        handleAnswer(data.from, data.sdp);
      }
    });

    // ICE candidates
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

    return () => {
      signalingNode.off();
    };
  }, [channelId, currentUser, handleOffer, handleAnswer]);

  // Connect to peers when channel users change
  useEffect(() => {
    if (!channelId || !currentUser) return;

    const users = channelUsers || {};
    const otherUsers = Object.keys(users).filter(u => u !== currentUser);
    const connectedPeers = Object.keys(peersRef.current);

    // Nieuwe users → stuur offer (alleen als wij alfabetisch "eerst" komen, voorkomt dubbele offers)
    otherUsers.forEach(remoteUser => {
      if (!connectedPeers.includes(remoteUser)) {
        if (currentUser < remoteUser) {
          sendOffer(remoteUser);
        }
      }
    });

    // Verwijderde users → cleanup
    connectedPeers.forEach(peer => {
      if (!otherUsers.includes(peer)) {
        removePeer(peer);
      }
    });
  }, [channelId, currentUser, channelUsers, sendOffer, removePeer]);

  // Acquire stream on channel join, cleanup on leave
  useEffect(() => {
    if (channelId) {
      getLocalStream().then(() => {
        startSpeakingMonitor();
      });
    } else {
      removeAllPeers();
      stopLocalStream();
    }

    return () => {
      removeAllPeers();
      stopLocalStream();
    };
  }, [channelId]);

  // Cleanup signaling data bij leave
  useEffect(() => {
    return () => {
      if (channelId) {
        // Verwijder onze signaling data
        const signalingNode = gun.get('TEAMTALK').get('signaling').get(channelId);
        Object.keys(peersRef.current).forEach(peer => {
          signalingNode.get(`${currentUser}_${peer}`).put(null);
          signalingNode.get(`${peer}_${currentUser}`).put(null);
        });
      }
    };
  }, [channelId, currentUser]);

  return {
    isMuted,
    speakingUsers,
    toggleMute,
    peerCount: Object.keys(peersRef.current).length,
    remoteAudiosRef
  };
}

export default useTeamTalkMesh;