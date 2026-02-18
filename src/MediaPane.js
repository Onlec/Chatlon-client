import React, { useState, useEffect, useRef } from 'react';
import { log } from './utils/debug';

function MediaPane({ onNowPlayingChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [audioUrl, setAudioUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [visualization, setVisualization] = useState('bars');
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Geen track geladen',
    artist: 'Onbekend',
    album: 'Onbekend'
  });

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationRef = useRef(null);
  const sourceRef = useRef(null);

  // Voorbeeldtracks die gebruikers kunnen gebruiken
  const sampleTracks = [
    {
      title: 'Darude - Sandstorm',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      artist: 'Darude',
      album: 'Before the Storm (2000)'
    },
    {
      title: 'Sample Track 1',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      artist: 'SoundHelix',
      album: 'Generated Music'
    },
    {
      title: 'Sample Track 2',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      artist: 'SoundHelix',
      album: 'Generated Music'
    }
  ];

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    }
  };

  const connectAudioSource = () => {
    if (!sourceRef.current && audioRef.current && audioContextRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
  };

  const loadTrack = (track) => {
    setAudioUrl(track.url);
    setCurrentTrack(track);
    setShowUrlInput(false);
    
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.load();
    }
  };

  const loadCustomUrl = () => {
    if (audioUrl.trim()) {
      const customTrack = {
        title: 'Custom Track',
        url: audioUrl,
        artist: 'Onbekend',
        album: 'Onbekend'
      };
      loadTrack(customTrack);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !audioUrl) return;

    initAudioContext();
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      onNowPlayingChange?.({ title: currentTrack.title, artist: currentTrack.artist, isPlaying: false });
    } else {
      connectAudioSource();
      await audioRef.current.play();
      visualize();
      onNowPlayingChange?.({ title: currentTrack.title, artist: currentTrack.artist, isPlaying: true });
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Gradient achtergrond
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, '#000000');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (visualization === 'bars') {
        drawBars(ctx, WIDTH, HEIGHT);
      } else if (visualization === 'wave') {
        drawWave(ctx, WIDTH, HEIGHT);
      } else if (visualization === 'circle') {
        drawCircle(ctx, WIDTH, HEIGHT);
      }
    };

    draw();
  };

  const drawBars = (ctx, WIDTH, HEIGHT) => {
    const bufferLength = analyserRef.current.frequencyBinCount;
    const barWidth = (WIDTH / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArrayRef.current[i] / 255) * HEIGHT;

      const r = barHeight + 25 * (i / bufferLength);
      const g = 250 * (i / bufferLength);
      const b = 50;

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  };

  const drawWave = (ctx, WIDTH, HEIGHT) => {
    const bufferLength = analyserRef.current.frequencyBinCount;
    const sliceWidth = WIDTH / bufferLength;
    let x = 0;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff88';
    ctx.beginPath();

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArrayRef.current[i] / 255;
      const y = (v * HEIGHT) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.stroke();

    // Reflectie
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.beginPath();
    x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArrayRef.current[i] / 255;
      const y = HEIGHT - (v * HEIGHT) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }
    ctx.stroke();
  };

  const drawCircle = (ctx, WIDTH, HEIGHT) => {
    const bufferLength = analyserRef.current.frequencyBinCount;
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    const radius = Math.min(WIDTH, HEIGHT) / 3;

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;

    for (let i = 0; i < bufferLength; i++) {
      const angle = (Math.PI * 2 * i) / bufferLength;
      const amp = dataArrayRef.current[i] / 255;
      const r = radius + amp * 80;

      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      if (i === 0) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      const hue = (i / bufferLength) * 360;
      ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
    }
    ctx.closePath();
    ctx.stroke();
  };

  return (
    <div className="media-container">
      {/* Menubar */}
      <div className="media-menubar">
        <span className="media-menu-item">Bestand</span>
        <span className="media-menu-item">Weergave</span>
        <span className="media-menu-item">Afspelen</span>
        <span className="media-menu-item">Extra</span>
        <span className="media-menu-item">Help</span>
      </div>

      {/* Main content area */}
      <div className="media-main">
        {/* Visualization area */}
        <div className="media-visualization">
          <canvas
            ref={canvasRef}
            width={600}
            height={300}
            className="media-canvas"
          />
          
          {!audioUrl && (
            <div className="media-no-track">
              <div className="media-no-track-icon">🎵</div>
              <div className="media-no-track-text">Geen track geladen</div>
              <button 
                className="media-load-btn"
                onClick={() => setShowUrlInput(true)}
              >
                Track laden
              </button>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="media-track-info">
          <div className="media-track-title">{currentTrack.title}</div>
          <div className="media-track-details">
            {currentTrack.artist} • {currentTrack.album}
          </div>
        </div>

        {/* Visualization selector */}
        <div className="media-viz-selector">
          <button 
            className={`media-viz-btn ${visualization === 'bars' ? 'active' : ''}`}
            onClick={() => setVisualization('bars')}
          >
            Balken
          </button>
          <button 
            className={`media-viz-btn ${visualization === 'wave' ? 'active' : ''}`}
            onClick={() => setVisualization('wave')}
          >
            Golf
          </button>
          <button 
            className={`media-viz-btn ${visualization === 'circle' ? 'active' : ''}`}
            onClick={() => setVisualization('circle')}
          >
            Cirkel
          </button>
        </div>

        {/* Progress bar */}
        <div className="media-progress-area">
          <span className="media-time">{formatTime(currentTime)}</span>
          <div 
            className="media-progress-bar"
            onClick={handleSeek}
          >
            <div 
              className="media-progress-fill"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <span className="media-time">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="media-controls">
          <button className="media-control-btn" title="Vorige">
            ⏮
          </button>
          <button 
            className="media-control-btn media-play-btn" 
            onClick={togglePlay}
            disabled={!audioUrl}
            title={isPlaying ? 'Pauzeren' : 'Afspelen'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="media-control-btn" title="Volgende">
            ⏭
          </button>
          <button className="media-control-btn" title="Stop" onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setIsPlaying(false);
              onNowPlayingChange?.({ title: currentTrack.title, artist: currentTrack.artist, isPlaying: false });
            }
          }}>
            ⏹
          </button>
        </div>

        {/* Volume control */}
        <div className="media-volume-area">
          <span className="media-volume-icon">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="media-volume-slider"
          />
          <span className="media-volume-text">{volume}%</span>
        </div>
      </div>

      {/* Playlist sidebar */}
      <div className="media-playlist">
        <div className="media-playlist-header">
          <span className="media-playlist-title">📋 Afspeellijst</span>
        </div>
        
        <div className="media-playlist-items">
          <div className="media-playlist-section">
            <div className="media-playlist-section-title">Voorbeeldtracks</div>
            {sampleTracks.map((track, index) => (
              <div 
                key={index}
                className={`media-playlist-item ${currentTrack.url === track.url ? 'active' : ''}`}
                onClick={() => loadTrack(track)}
              >
                <div className="media-playlist-item-icon">🎵</div>
                <div className="media-playlist-item-info">
                  <div className="media-playlist-item-title">{track.title}</div>
                  <div className="media-playlist-item-artist">{track.artist}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="media-playlist-section">
            <div className="media-playlist-section-title">Custom URL</div>
            <button 
              className="media-add-url-btn"
              onClick={() => setShowUrlInput(!showUrlInput)}
            >
              + URL Toevoegen
            </button>
            
            {showUrlInput && (
              <div className="media-url-input-area">
                <input
                  type="text"
                  placeholder="https://example.com/song.mp3"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="media-url-input"
                  onKeyDown={(e) => e.key === 'Enter' && loadCustomUrl()}
                />
                <button 
                  className="media-url-load-btn"
                  onClick={loadCustomUrl}
                >
                  Laden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          onNowPlayingChange?.({ title: currentTrack.title, artist: currentTrack.artist, isPlaying: false });
        }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

export default MediaPane;