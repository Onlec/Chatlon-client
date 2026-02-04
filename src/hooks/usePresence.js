// src/hooks/usePresence.js
import { useState, useEffect, useRef } from 'react';
import { gun, user } from '../gun';
import { PRESENCE_HEARTBEAT_INTERVAL, PRESENCE_TIMEOUT } from '../presenceUtils';

export function usePresence(isLoggedIn, currentUser) {
  const [userStatus, setUserStatus] = useState('online');
  const [isManualStatus, setIsManualStatus] = useState(false);
  const userStatusRef = useRef(userStatus);
  const presenceIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Sync ref
  useEffect(() => {
    userStatusRef.current = userStatus;
  }, [userStatus]);

  // Heartbeat effect
  useEffect(() => { /* ... */ }, [isLoggedIn, currentUser]);

  // beforeunload effect
  useEffect(() => { /* ... */ }, [isLoggedIn, currentUser]);

  // Activity detection effect
  useEffect(() => { /* ... */ }, [isLoggedIn, isManualStatus]);

  const handleStatusChange = (newStatus) => {
    setIsManualStatus(true);
    setUserStatus(newStatus);
    updatePresence(newStatus);
  };

  const cleanup = () => {
    setOfflinePresence();
    clearInterval(presenceIntervalRef.current);
  };

  return {
    userStatus,
    handleStatusChange,
    cleanup // voor logout
  };
}