// src/hooks/useWebRTC.js
/**
 * WebRTC Hook — Fase 1: Audio Only
 * 
 * Beheert RTCPeerConnection lifecycle, signaling via Gun.js,
 * en audio stream management.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { gun } from '../gun';
import { getContactPairId } from '../utils/chatUtils';
import { log } from '../utils/debug';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

/**
 * @typedef {'idle'|'calling'|'ringing'|'connected'|'ended'} CallState
 */

/**
 * Hook voor WebRTC audio calls.
 * 
 * @param {string} currentUser - Huidige username
 * @param {string} contactName - Contact username
 * @returns {Object} Call state en functies
 */
export function useWebRTC(currentUser, contactName) {
  const [callState, setCallState] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);
  const callNodeRef = useRef(null);
  const iceNodeRef = useRef(null);
  const signalListenerRef = useRef(null);
  const iceListenerRef = useRef(null);
  const processedIceRef = useRef(new Set());
  const callIdRef = useRef(null);

  const pairId = currentUser && contactName
    ? getContactPairId(currentUser, contactName)
    : null;

  // ============================================
  // HELPERS
  // ============================================

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && pairId) {
        const candidateId = `ice_${currentUser}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        gun.get('CALLS').get(pairId).get('ice').get(candidateId).put({
          candidate: JSON.stringify(event.candidate),
          from: currentUser,
          timestamp: Date.now()
        });
        log('[useWebRTC] ICE candidate sent');
      }
    };

    pc.ontrack = (event) => {
      log('[useWebRTC] Remote track received');
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      log('[useWebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        startCallTimer();
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        hangUp();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [pairId, currentUser]);

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      log('[useWebRTC] Microphone access denied:', err.message);
      setCallState('idle');
      return null;
    }
  }, []);

  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const cleanupCall = useCallback(() => {
    log('[useWebRTC] Cleaning up call');

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    processedIceRef.current.clear();
    setCallDuration(0);
    setIsMuted(false);
  }, []);

  // ============================================
  // CALL ACTIONS
  // ============================================

  const startCall = useCallback(async () => {
    if (!pairId || callState !== 'idle') return;

    log('[useWebRTC] Starting call to:', contactName);
    setCallState('calling');

    const callId = `call_${Date.now()}`;
    callIdRef.current = callId;

    // Cleanup oude call data
    gun.get('CALLS').get(pairId).put(null);

    const stream = await getLocalStream();
    if (!stream) return;

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    gun.get('CALLS').get(pairId).put({
      type: 'offer',
      sdp: JSON.stringify(offer),
      from: currentUser,
      callType: 'audio',
      callId: callId,
      timestamp: Date.now()
    });

    log('[useWebRTC] Offer sent');
  }, [pairId, callState, contactName, currentUser, getLocalStream, createPeerConnection]);

  const acceptCall = useCallback(async (offerSdp) => {
    if (!pairId) return;

    log('[useWebRTC] Accepting call from:', contactName);
    setCallState('connected');

    const stream = await getLocalStream();
    if (!stream) return;

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = JSON.parse(offerSdp);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    gun.get('CALLS').get(pairId).put({
      type: 'answer',
      sdp: JSON.stringify(answer),
      from: currentUser,
      timestamp: Date.now()
    });

    log('[useWebRTC] Answer sent');
  }, [pairId, contactName, currentUser, getLocalStream, createPeerConnection]);

  const rejectCall = useCallback(() => {
    if (!pairId) return;

    log('[useWebRTC] Rejecting call from:', contactName);

    gun.get('CALLS').get(pairId).put({
      type: 'reject',
      from: currentUser,
      timestamp: Date.now()
    });

    setCallState('idle');
  }, [pairId, contactName, currentUser]);

  const hangUp = useCallback(() => {
    if (!pairId) return;

    log('[useWebRTC] Hanging up');

    gun.get('CALLS').get(pairId).put({
      type: 'hangup',
      from: currentUser,
      timestamp: Date.now()
    });

    cleanupCall();
    setCallState('idle');
  }, [pairId, currentUser, cleanupCall]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        log('[useWebRTC] Mute toggled:', !audioTrack.enabled);
      }
    }
  }, []);

  // ============================================
  // SIGNALING LISTENER
  // ============================================

  useEffect(() => {
    if (!pairId || !currentUser) return;

    const callNode = gun.get('CALLS').get(pairId);

    callNode.on((data) => {
      if (!data || !data.type || data.from === currentUser) return;

      // Negeer oude signalen (> 30s)
      if (data.timestamp && (Date.now() - data.timestamp > 30000)) return;

      log('[useWebRTC] Signal received:', data.type, 'from:', data.from);

      switch (data.type) {
        case 'offer':
          if (callState === 'idle') {
            callIdRef.current = data.callId;
            setCallState('ringing');
          }
          break;

        case 'answer':
          if (callState === 'calling' && peerConnectionRef.current) {
            const answer = JSON.parse(data.sdp);
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            setCallState('connected');
            startCallTimer();
          }
          break;

        case 'reject':
          if (callState === 'calling') {
            cleanupCall();
            setCallState('idle');
          }
          break;

        case 'hangup':
          cleanupCall();
          setCallState('idle');
          break;
      }
    });

    // ICE candidate listener
    callNode.get('ice').map().on((data, id) => {
      if (!data || !data.candidate || data.from === currentUser) return;
      if (processedIceRef.current.has(id)) return;
      processedIceRef.current.add(id);

      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        const candidate = JSON.parse(data.candidate);
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(err => log('[useWebRTC] ICE error:', err.message));
      }
    });

    return () => {
      callNode.off();
    };
  }, [pairId, currentUser, callState, cleanupCall, startCallTimer]);

  // Cleanup bij unmount
  useEffect(() => {
    return () => {
      if (callState !== 'idle') {
        hangUp();
      }
    };
  }, []);

  return {
    // State
    callState,
    isMuted,
    callDuration,
    remoteAudioRef,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute
  };
}

export default useWebRTC;