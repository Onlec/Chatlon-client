import { useCallback, useState } from 'react';

export function useStartMenuManager() {
  const [isStartOpen, setIsStartOpen] = useState(false);

  const toggleStartMenu = useCallback(() => {
    setIsStartOpen((prev) => !prev);
  }, []);

  const closeStartMenu = useCallback(() => {
    setIsStartOpen(false);
  }, []);

  return {
    isStartOpen,
    setIsStartOpen,
    toggleStartMenu,
    closeStartMenu
  };
}

export default useStartMenuManager;
