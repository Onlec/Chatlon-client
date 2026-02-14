import React, { useState, useEffect, useRef } from 'react';
import { log } from './utils/debug';

function BootSequence({ onBootComplete }) {
  const [stage, setStage] = useState('post'); // post, xpboot, welcome, fadeout
  const [showCursor, setShowCursor] = useState(true);
  const [memoryCount, setMemoryCount] = useState(0);
  const [postLines, setPostLines] = useState([]);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);
  
  const audioRef = useRef(null);
  const biosBeepRef = useRef(null);

  // POST stage - BIOS screen
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
██████╔╝██║   ██║█████╗  █████╗██║     ██║   ██║██████╔╝█████╗  
██╔══██╗██║   ██║██╔══╝  ╚════╝██║     ██║   ██║██╔══██╗██╔══╝  
██████╔╝╚██████╔╝██║           ╚██████╗╚██████╔╝██║  ██║███████╗
╚═════╝  ╚═════╝ ╚═╝            ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝`.split('\n');

    const lines = [
        '',
        ...logoRows, // Voegt alle regels van het logo toe aan de start
        '',
        '          ---  T H E   F O U N D A T I O N   O F   P O W E R  ---',
        '',
        'BufCore BIOS v2.51.1234',
        'Copyright (C) 1984-2003, BufCore Systems, Inc.',
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
      }, 100);

      return () => {
        clearInterval(cursorInterval);
        clearInterval(memInterval);
        clearInterval(lineInterval);
      };
    }
  }, [stage]);

  // XP Boot stage - animated logo
  useEffect(() => {
    if (stage === 'xpboot') {
      // After 4 seconds, show Welcome screen
      const timer = setTimeout(() => {
        setStage('welcome');
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Welcome stage
  useEffect(() => {
    if (stage === 'welcome') {
      // After 3 seconds, fade to desktop
      const timer = setTimeout(() => {
        setStage('fadeout');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [stage]);

  // Fadeout stage - complete boot
  useEffect(() => {
    if (stage === 'fadeout') {
      // Play Panes dX startup sound
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      // After 2 seconds, call onBootComplete
      const timer = setTimeout(() => {
        onBootComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [stage, onBootComplete]);

  // Keyboard listener for scanlines toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5') {
        setScanlinesEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`boot-sequence ${stage}`}>
      {/* POST/BIOS Stage */}
      {stage === 'post' && (
        <div className={`boot-post ${scanlinesEnabled ? 'scanlines' : ''}`}>
          <div className="boot-post-content">
            {postLines.map((line, index) => {
              if (line === 'Memory Testing: OK') {
                return (
                  <div key={index} className="boot-post-line">
                    Memory Testing: {memoryCount} MB {memoryCount >= 256 ? 'OK' : '...'}
                  </div>
                );
              }
              return (
                <div key={index} className="boot-post-line">
                  {line}
                </div>
              );
            })}
            {showCursor && <span className="boot-cursor">_</span>}
          </div>
          <div className="boot-post-footer">
            <span className="boot-hint">F5: Toggle Scanlines</span>
          </div>
        </div>
      )}

      {/* Panes dX Boot Stage */}
      {stage === 'xpboot' && (
        <div className="boot-dx">
          <div className="boot-dx-content">
            <div className="boot-dx-logo">
              <svg width="300" height="100" viewBox="0 0 300 100">
                {/* Panes dX Logo - simplified version */}
                <defs>
                  <linearGradient id="red-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#FF0000', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#CC0000', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#00FF00', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#00CC00', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#0000FF', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#0000CC', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="yellow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#FFFF00', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#CCCC00', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                
                {/* Four colored rectangles arranged as XP logo */}
                <rect x="30" y="10" width="50" height="35" fill="url(#red-gradient)" transform="skewX(-10)" />
                <rect x="90" y="10" width="50" height="35" fill="url(#green-gradient)" transform="skewX(-10)" />
                <rect x="30" y="55" width="50" height="35" fill="url(#blue-gradient)" transform="skewX(-10)" />
                <rect x="90" y="55" width="50" height="35" fill="url(#yellow-gradient)" transform="skewX(-10)" />
                
                {/* Microsoft text */}
                <text x="160" y="40" fontFamily="Arial, sans-serif" fontSize="16" fill="#fff" fontWeight="normal">
                  Macrohard
                </text>
                
                {/* Panes dX text */}
                <text x="160" y="65" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="24" fill="#fff" fontWeight="bold">
                  Panes
                </text>
                <text x="245" y="65" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="24" fill="#fff" fontWeight="bold" fontStyle="italic">
                  dX
                </text>
                
                {/* Professional text */}
                <text x="160" y="80" fontFamily="Arial, sans-serif" fontSize="11" fill="#ccc">
                  Professional
                </text>
              </svg>
            </div>
            
            <div className="boot-dx-loading">
              <div className="boot-dx-bar">
                <div className="boot-dx-bar-inner"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Stage */}
      {stage === 'welcome' && (
        <div className="boot-welcome">
          <div className="boot-welcome-text">Welkom</div>
        </div>
      )}

      {/* Fadeout Stage */}
      {stage === 'fadeout' && (
        <div className="boot-fadeout">
          <div className="boot-bliss-preview"></div>
        </div>
      )}

      {/* Audio elements */}
      <audio ref={biosBeepRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZXQ8NTqXi8bh2JAQufM7x4JdJCxVVrOXvs2sZCkaY4fHAeCwFKHzL8dyTQwoVYLXn7qVaEwxIpN/xu3AfBzaM0/PShTcHG2/E7+OaWQ8PVKzk775rHAU3jtLy0Yg4Bxxwxe7il1wPDk6o4vG/dyQEM3vO8d+VSRMUW7Pm76lZFAw=" />
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" />
    </div>
  );
}

export default BootSequence;