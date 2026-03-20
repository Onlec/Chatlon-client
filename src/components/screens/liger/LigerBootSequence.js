import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useScanlinesPreference } from '../../../contexts/ScanlinesContext';

const DARWIN_LINES = [
  'darwin/bsd kernel starting...',
  'BSD root: disk0s2, major 14, minor 2',
  'Jettisoning kernel linker.',
  'Initializing IOCatalogue.',
  'IOAPIC: Version 0x11 Vectors 0:23',
  'USB: init complete.',
  'FireWire (OHCI) Lucent ID 5811 built-in: 0 active isoch channels',
  'AirPort: Link Down on en1',
  'Fruitware Liger 10.4.1 (build 8B15)'
];

function buildPostLines() {
  return [
    '',
    '██████╗ ██╗   ██╗███████╗       ██████╗ ██████╗ ██████╗ ███████╗',
    '██╔══██╗██║   ██║██╔════╝      ██╔════╝██╔═══██╗██╔══██╗██╔════╝',
    '███████║██║   ██║█████╗  █████╗██║     ██║   ██║██████╔╝█████╗  ',
    '██╔══██║██║   ██║██╔══╝  ╚════╝██║     ██║   ██║██╔══██╗██╔══╝  ',
    '███████║╚██████╔╝██║           ╚██████╗╚██████╔╝██║  ██║███████╗',
    '╚══════╝ ╚═════╝ ╚═╝            ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝',
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
}

function LigerBootSequence({ onBootComplete }) {
  const [stage, setStage] = useState('post');
  const [showCursor, setShowCursor] = useState(true);
  const [memoryCount, setMemoryCount] = useState(0);
  const [postLines, setPostLines] = useState([]);
  const [darwinLines, setDarwinLines] = useState([]);
  const [fadeOut, setFadeOut] = useState(false);
  const { scanlinesEnabled } = useScanlinesPreference();
  const biosBeepRef = useRef(null);
  const postSequence = useMemo(() => buildPostLines(), []);

  useEffect(() => {
    if (stage !== 'post') return undefined;

    const cursorInterval = setInterval(() => {
      setShowCursor((current) => !current);
    }, 500);

    const beepTimer = setTimeout(() => {
      if (biosBeepRef.current) {
        biosBeepRef.current.play().catch(() => {});
      }
    }, 100);

    const memoryInterval = setInterval(() => {
      setMemoryCount((current) => {
        if (current >= 256) {
          clearInterval(memoryInterval);
          return 256;
        }
        return current + 16;
      });
    }, 50);

    let lineIndex = 0;
    const lineInterval = setInterval(() => {
      if (lineIndex < postSequence.length) {
        setPostLines((current) => [...current, postSequence[lineIndex]]);
        lineIndex += 1;
        return;
      }
      clearInterval(lineInterval);
      setTimeout(() => {
        setStage('darwin');
      }, 500);
    }, 80);

    return () => {
      clearInterval(cursorInterval);
      clearInterval(memoryInterval);
      clearInterval(lineInterval);
      clearTimeout(beepTimer);
    };
  }, [postSequence, stage]);

  useEffect(() => {
    if (stage !== 'darwin') return undefined;

    let lineIndex = 0;
    const lineInterval = setInterval(() => {
      if (lineIndex >= DARWIN_LINES.length) {
        clearInterval(lineInterval);
        return;
      }
      setDarwinLines((current) => [...current, DARWIN_LINES[lineIndex]]);
      lineIndex += 1;
    }, 60);

    const stageTimer = setTimeout(() => {
      setStage('liger');
    }, 2500);

    return () => {
      clearInterval(lineInterval);
      clearTimeout(stageTimer);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'liger') return undefined;

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    const completeTimer = setTimeout(() => {
      sessionStorage.setItem('chatlon_boot_complete', 'true');
      onBootComplete();
    }, 3300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onBootComplete, stage]);

  return (
    <div className={`liger-boot liger-boot--${stage}`} data-stage={stage}>
      <div className={`scanlines-overlay ${scanlinesEnabled ? '' : 'scanlines-overlay--disabled'}`} />

      {stage === 'post' && (
        <div className="liger-post">
          <div className="liger-post__content">
            {postLines.map((line, index) => (
              <div key={`${line}-${index}`} className="liger-post__line">
                {line === 'Memory Testing: OK'
                  ? `Memory Testing: ${memoryCount} MB ${memoryCount >= 256 ? 'OK' : '...'}`
                  : line}
              </div>
            ))}
            {showCursor && <span className="liger-post__cursor">_</span>}
          </div>
          <div className="liger-post__footer">S: Toggle Scanlines</div>
        </div>
      )}

      {stage === 'darwin' && (
        <div className="liger-darwin">
          <div className="liger-darwin__output">
            {darwinLines.map((line, index) => (
              <div key={`${line}-${index}`} className="liger-darwin__line">{line}</div>
            ))}
          </div>
        </div>
      )}

      {stage === 'liger' && (
        <div className="liger-splash">
          <div className="liger-splash__mark" aria-hidden="true">🐯</div>
          <div className="liger-splash__wordmark">Liger</div>
          <div className="liger-splash__spinner" aria-hidden="true" />
        </div>
      )}

      {fadeOut && <div className="boot-fade-overlay" />}

      <audio
        ref={biosBeepRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZXQ8NTqXi8bh2JAQufM7x4JdJCxVVrOXvs2sZCkaY4fHAeCwFKHzL8dyTQwoVYLXn7qVaEwxIpN/xu3AfBzaM0/PShTcHG2/E7+OaWQ8PVKzk775rHAU3jtLy0Yg4Bxxwxe7il1wPDk6o4vG/dyQEM3vO8d+VSRMUW7Pm76lZFAw="
      />
    </div>
  );
}

export default LigerBootSequence;
