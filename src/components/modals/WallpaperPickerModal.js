import React, { useState, useRef } from 'react';
import { useWallpaper } from '../../contexts/WallpaperContext';
import ModalPane from './ModalPane';

const PRESET_WALLPAPERS = [
  'background.jpg'
];

const SOLID_COLORS = [
  { label: 'Blauw', value: '#3A6EA5' },
  { label: 'Teal', value: '#008080' },
  { label: 'Groen', value: '#3A7A3A' },
  { label: 'Bordeaux', value: '#6A2E35' },
  { label: 'Paars', value: '#4B3A6E' },
  { label: 'Zwart', value: '#000000' },
  { label: 'Grijs', value: '#808080' },
  { label: 'Wit', value: '#FFFFFF' }
];

function WallpaperPickerModal({ onClose }) {
  const { wallpaper, wallpaperType, setMyWallpaper, resetWallpaper } = useWallpaper();
  const [activeTab, setActiveTab] = useState('preset');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          // Max 1920x1080 voor redelijke Gun opslag
          const maxW = 1920;
          const maxH = 1080;
          let w = img.width;
          let h = img.height;

          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          // Gun heeft een limiet — warn bij grote bestanden
          if (dataUrl.length > 500000) {
            reject('Afbeelding is te groot na compressie. Kies een kleinere foto.');
            return;
          }
          resolve(dataUrl);
        };
        img.onerror = () => reject('Kan afbeelding niet laden.');
        img.src = e.target.result;
      };
      reader.onerror = () => reject('Kan bestand niet lezen.');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Alleen afbeeldingsbestanden zijn toegestaan.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Bestand is te groot. Maximum is 10MB.');
      return;
    }

    try {
      const resized = await resizeImage(file);
      setUploadPreview(resized);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Fout bij verwerken van afbeelding.');
    }
  };

  const handleSave = () => {
    setError('');
    if (activeTab === 'preset') {
      if (!selectedPreset) {
        setError('Selecteer een achtergrond.');
        return;
      }
      setMyWallpaper(selectedPreset, 'preset');
    } else if (activeTab === 'color') {
      if (!selectedColor) {
        setError('Selecteer een kleur.');
        return;
      }
      setMyWallpaper(selectedColor, 'color');
    } else {
      if (!uploadPreview) {
        setError('Upload een afbeelding eerst.');
        return;
      }
      setMyWallpaper(uploadPreview, 'upload');
    }
    setSuccess(true);
    setTimeout(() => onClose(), 1000);
  };

  const handleReset = () => {
    resetWallpaper();
    setSuccess(true);
    setTimeout(() => onClose(), 1000);
  };

  // Huidige achtergrond preview
  const getCurrentPreview = () => {
    if (wallpaperType === 'color') {
      return <div className="wallpaper-current-preview" style={{ background: wallpaper }} />;
    }
    return <img src={wallpaper} alt="Huidige achtergrond" className="wallpaper-current-preview" />;
  };

  return (
    <ModalPane title="Bureaublad achtergrond" icon="🖼️" onClose={onClose} width="560px">
        <div className="modal-body wallpaper-picker-dialog">
          <div className="wallpaper-current">
            {getCurrentPreview()}
            <div className="wallpaper-current-label">Huidige achtergrond</div>
          </div>

          <div className="avatar-picker-tabs">
            <button
              className={`avatar-tab-btn ${activeTab === 'preset' ? 'avatar-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('preset')}
            >
              Achtergronden
            </button>
            <button
              className={`avatar-tab-btn ${activeTab === 'color' ? 'avatar-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('color')}
            >
              Effen kleur
            </button>
            <button
              className={`avatar-tab-btn ${activeTab === 'upload' ? 'avatar-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Eigen foto
            </button>
          </div>

          <canvas ref={canvasRef} className="wallpaper-picker-canvas--hidden" />

          {activeTab === 'preset' && (
            <div className="wallpaper-preset-grid">
              {PRESET_WALLPAPERS.map((key) => (
                <div
                  key={key}
                  className={`wallpaper-preset-item ${selectedPreset === key ? 'wallpaper-preset-item--selected' : ''}`}
                  onClick={() => setSelectedPreset(key)}
                >
                  <img src={`/bg/${key}`} alt={key} />
                  <div className="wallpaper-preset-label">{key.replace(/\.[^.]+$/, '')}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'color' && (
            <div className="wallpaper-color-grid">
              {SOLID_COLORS.map((c) => (
                <div
                  key={c.value}
                  className={`wallpaper-color-item ${selectedColor === c.value ? 'wallpaper-color-item--selected' : ''}`}
                  onClick={() => setSelectedColor(c.value)}
                >
                  <div className="wallpaper-color-swatch" style={{ background: c.value }} />
                  <div className="wallpaper-color-label">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="avatar-upload-panel">
              <p className="avatar-upload-hint">
                Kies een foto van uw computer. Grote afbeeldingen worden automatisch verkleind.
              </p>
              <button
                className="dx-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Bladeren...
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="wallpaper-picker-file-input--hidden"
                onChange={handleFileChange}
              />
              {uploadPreview && (
                <div className="wallpaper-upload-preview">
                  <img src={uploadPreview} alt="Voorbeeld" />
                </div>
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">✓ Achtergrond opgeslagen!</div>}

          <div className="form-actions">
            <button className="dx-button dx-button--primary" onClick={handleSave}>Toepassen</button>
            <button className="dx-button" onClick={handleReset}>Standaard herstellen</button>
            <button className="dx-button" onClick={onClose}>Annuleren</button>
          </div>
        </div>
    </ModalPane>
  );
}

export default WallpaperPickerModal;
