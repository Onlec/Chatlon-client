import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_OPTIONS } from '../utils/presenceUtils';

export function useSystrayManager({
  userStatus,
  onStatusChange,
  onOpenContacts,
  onSignOut,
  onCloseMessenger
}) {
  const [showSystrayMenu, setShowSystrayMenu] = useState(false);
  const systrayMenuRef = useRef(null);
  const systrayIconRef = useRef(null);

  const currentStatusOption = useMemo(
    () => STATUS_OPTIONS.find((s) => s.value === userStatus) || STATUS_OPTIONS[0],
    [userStatus]
  );

  const closeSystrayMenu = useCallback(() => {
    setShowSystrayMenu(false);
  }, []);

  const onToggleMenu = useCallback((e) => {
    e.stopPropagation();
    setShowSystrayMenu((prev) => !prev);
  }, []);

  const handleStatusChange = useCallback((value) => {
    onStatusChange(value);
    setShowSystrayMenu(false);
  }, [onStatusChange]);

  const handleOpenContacts = useCallback(() => {
    onOpenContacts();
    setShowSystrayMenu(false);
  }, [onOpenContacts]);

  const handleSignOut = useCallback(() => {
    onSignOut();
    setShowSystrayMenu(false);
  }, [onSignOut]);

  const handleCloseMessenger = useCallback(() => {
    onCloseMessenger();
    setShowSystrayMenu(false);
  }, [onCloseMessenger]);

  useEffect(() => {
    if (!showSystrayMenu) return;
    const handleClick = (e) => {
      if (
        systrayMenuRef.current &&
        !systrayMenuRef.current.contains(e.target) &&
        systrayIconRef.current &&
        !systrayIconRef.current.contains(e.target)
      ) {
        setShowSystrayMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSystrayMenu]);

  return {
    showSystrayMenu,
    systrayMenuRef,
    systrayIconRef,
    currentStatusOption,
    onToggleMenu,
    closeSystrayMenu,
    onStatusChange: handleStatusChange,
    onOpenContacts: handleOpenContacts,
    onSignOut: handleSignOut,
    onCloseMessenger: handleCloseMessenger
  };
}

export default useSystrayManager;
