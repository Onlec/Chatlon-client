import React, { useState, useEffect, useRef } from 'react';
import { log } from '../../utils/debug';
import { useScanlinesPreference } from '../../contexts/ScanlinesContext';

function BootSequence({ onBootComplete }) {
  const [stage, setStage] = useState('post'); // post, xpboot
  const [showCursor, setShowCursor] = useState(true);
  const [memoryCount, setMemoryCount] = useState(0);
  const [postLines, setPostLines] = useState([]);
  const [fadeOut, setFadeOut] = useState(false);
  const { scanlinesEnabled } = useScanlinesPreference();  
  
  const biosBeepRef = useRef(null);

  // POST stage - Volledige BIOS screen met ASCII logo
  useEffect(() => {
    if (stage === 'post') {
      // Cursor blink
      const cursorInterval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);

      // BIOS beep sound
      setTimeout(() => {
        if (biosBeepRef.current) {
          biosBeepRef.current.play().catch(() => {});
        }
      }, 100);

      // Memory count animation
      const memInterval = setInterval(() => {
        setMemoryCount(prev => {
          if (prev >= 256) {
            clearInterval(memInterval);
            return 256;
          }
          return prev + 16;
        });
      }, 50);

      // Build POST text line by line
      const logoRows = String.raw`
██████╗ ██╗   ██╗███████╗       ██████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██║   ██║██╔════╝      ██╔════╝██╔═══██╗██╔══██╗██╔════╝
███████║██║   ██║█████╗  █████╗██║     ██║   ██║██████╔╝█████╗  
██╔══██║██║   ██║██╔══╝  ╚════╝██║     ██║   ██║██╔══██╗██╔══╝  
███████║╚██████╔╝██║           ╚██████╗╚██████╔╝██║  ██║███████╗
╚══════╝ ╚═════╝ ╚═╝            ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝`.split('\n');

      const lines = [
        '',
        ...logoRows,
        '',
        '    ---  T H E   F O U N D A T I O N   O F   P O W E R  ---',
        '',
        'BufCore BIOS v2.51.1234',
        'Copyright (C) 1993-2003, BufCore Systems, Inc.',
        '',
        'Main Processor: Intel(R) Pentium(R) 4 CPU 2.40GHz',
        'Memory Test: ',
        'Memory Testing: OK',
        '',
        'Detecting IDE Drives...',
        '  Primary Master  : ST380021A (80.0 GB)',
        '  Primary Slave   : PIONEER DVD-RW DVR-A05',
        '  Secondary Master: None',
        '  Secondary Slave : None',
        '',
        'Boot Sequence: C, A, CDROM',
        '',
        'Press DEL to enter SETUP, F12 for Boot Menu',
        '',
        'Verifying DMI Pool Data...........',
        'Boot from ATAPI CD-ROM : Failure',
        'Boot from Hard Disk...',
        ''
      ];

      let lineIndex = 0;
      const lineInterval = setInterval(() => {
        if (lineIndex < lines.length) {
          setPostLines(prev => [...prev, lines[lineIndex]]);
          lineIndex++;
        } else {
          clearInterval(lineInterval);
          // Move to XP boot after POST
          setTimeout(() => {
            setStage('xpboot');
          }, 500);
        }
      }, 80);

      return () => {
        clearInterval(cursorInterval);
        clearInterval(memInterval);
        clearInterval(lineInterval);
      };
    }
  }, [stage]);

  // XP Boot stage
  useEffect(() => {
    if (stage === 'xpboot') {
      // Na 3.2s fade-out starten, na 4s boot complete
      const fadeTimer = setTimeout(() => {
        setFadeOut(true);
      }, 3200);

      const timer = setTimeout(() => {
        sessionStorage.setItem('chatlon_boot_complete', 'true');
        onBootComplete();
      }, 4000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(timer);
      };
    }
  }, [stage, onBootComplete]);

  return (
    <div className="boot-sequence">
      {/* POST/BIOS Stage - Volledige retro screen */}
      {stage === 'post' && (
        <div className={`xp-post ${scanlinesEnabled ? 'scanlines' : ''}`}>
          <div className="xp-post-content">
            {postLines.map((line, index) => {
              if (line === 'Memory Testing: OK') {
                return (
                  <div key={index} className="xp-post-line">
                    Memory Testing: {memoryCount} MB {memoryCount >= 256 ? 'OK' : '...'}
                  </div>
                );
              }
              return (
                <div key={index} className="xp-post-line">
                  {line}
                </div>
              );
            })}
            {showCursor && <span className="xp-post-cursor">_</span>}
          </div>
          <div className="xp-post-footer">
            <span className="xp-hint">S: Toggle Scanlines</span>
          </div>
        </div>
      )}

      {/* XP Boot Stage - Authentieke XP loading */}
      {stage === 'xpboot' && (
        <div className="xp-boot">
          <div className="xp-boot-content">
            {/* XP Logo + Brand — geïntegreerde layout */}
            <div className="xp-brand-layout">
              <div className="xp-brand-left">
                <span className="xp-brand-microsoft">Macrohard</span>
                <span className="xp-brand-windows">Panes<span className="xp-brand-xp">dX</span></span>
              </div>
              <div className="xp-brand-right">
                <div className="xp-boot-logo">
                  <div className="xp-logo-stripe xp-stripe-green"></div>
                  <div className="xp-logo-stripe xp-stripe-blue"></div>
                  <div className="xp-logo-stripe xp-stripe-red"></div>
                </div>
              </div>
            </div>

            {/* Authentic XP Loading Bar */}
            <div className="xp-boot-loading">
              <div className="xp-loading-bar">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="xp-loading-block"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Copyright tekst */}
            <div className="xp-boot-copyright">
              Copyright © Macrohard Corporation
            </div>
          </div>
        </div>
      )}

      {/* Fade to black overlay */}
      {fadeOut && <div className="boot-fade-overlay" />}

      {/* Audio */}
      <audio ref={biosBeepRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZXQ8NTqXi8bh2JAQufM7x4JdJCxVVrOXvs2sZCkaY4fHAeCwFKHzL8dyTQwoVYLXn7qVaEwxIpN/xu3AfBzaM0/PShTcHG2/E7+OaWQ8PVKzk775rHAU3jtLy0Yg4Bxxwxe7il1wPDk6o4vG/dyQEM3vO8d+VSRMUW7Pm76lZFAw=" />
    </div>
  );
}

export default BootSequence;