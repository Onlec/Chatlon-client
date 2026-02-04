// src/hooks/useToasts.js
import { useState, useRef } from 'react';

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const shownToastsRef = useRef(new Set());

  const showToast = (toastData) => {
    const toastId = `toast_${Date.now()}_${Math.random()}`;
    new Audio('/nudge.mp3').play().catch(() => {});
    setToasts(prev => [...prev, { id: toastId, ...toastData }]);
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const isToastShown = (key) => shownToastsRef.current.has(key);
  const markToastShown = (key) => shownToastsRef.current.add(key);

  return { toasts, showToast, removeToast, isToastShown, markToastShown };
}