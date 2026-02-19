// src/components/PinballPane.js
/**
 * 3D Flipperkast Ruimte Kadet — Pinball pane
 * 
 * Embed van de WASM port van Space Cadet Pinball.
 * Bron: github.com/lrusso/3DPinballSpaceCadet
 * 
 * Besturing:
 * Z = linker flipper, C = rechter flipper
 * Space = lanceer bal, X = tilt
 * R = herstart, T = geluid aan/uit
 */

import React, { useRef, useEffect, useState } from 'react';

const PINBALL_URL = '/pinball/3DPinballSpaceCadet.htm';
function PinballPane() {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  // Focus iframe zodat keyboard input werkt
  const focusGame = () => {
    if (iframeRef.current) {
      iframeRef.current.focus();
      setIsFocused(true);
    }
  };

  useEffect(() => {
    // Auto-focus bij mount
    const timer = setTimeout(focusGame, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pinball-container" onMouseDown={(e) => e.stopPropagation()}>
      {isLoading && (
        <div className="pinball-loading">
          <div className="pinball-loading-text">
            ⏳ Flipperkast laden...
          </div>
          <div className="pinball-loading-sub">
            3D Flipperkast Ruimte Kadet
          </div>
        </div>
      )}

      {!isFocused && !isLoading && (
        <div className="pinball-focus-overlay" onClick={focusGame}>
          <div className="pinball-focus-text">
            🎯 Klik om te spelen
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={PINBALL_URL}
        className="pinball-iframe"
        title="3D Flipperkast Ruimte Kadet"
        onLoad={() => {
          setIsLoading(false);
          setTimeout(focusGame, 300);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        allow="autoplay"
      />

      <div className="pinball-controls-bar">
        <span className="pinball-control">Z = Links</span>
        <span className="pinball-control">C = Rechts</span>
        <span className="pinball-control">Space = Lanceer</span>
        <span className="pinball-control">X = Tilt</span>
        <span className="pinball-control">R = Herstart</span>
        <span className="pinball-control">T = Geluid</span>
      </div>
    </div>
  );
}

export default PinballPane;