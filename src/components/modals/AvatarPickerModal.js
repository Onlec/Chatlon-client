import React, { useState, useRef, useEffect } from 'react';
import { useAvatar } from '../../contexts/AvatarContext';
import { user } from '../../gun';
import ModalPane from './ModalPane';

const PRESET_AVATARS = [
  'cat.jpg', 'egg.jpg', 'crab.jpg', 'blocks.jpg', 'pug.jpg'
];

function AvatarPickerModal({ onClose }) {
  const { setMyAvatar, clearMyAvatar, getAvatar } = useAvatar();
  const [activeTab, setActiveTab] = useState('preset');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [presets, setPresets] = useState(PRESET_AVATARS);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const username = user.is?.alias;
  const currentAvatar = getAvatar(username);

  // Scan for available preset files dynamically
  useEffect(() => {
    // Start with the known presets; more can be added to PRESET_AVATARS above
    setPresets(PRESET_AVATARS);
  }, []);

  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          canvas.width = 110;
          canvas.height = 110;
          const ctx = canvas.getContext('2d');

          // Witte achtergrond voor JPEG (transparantie wordt wit)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 110, 110);

          // Center-crop: neem de kleinste zijde als vierkant
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 110, 110);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
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
    if (file.size > 5 * 1024 * 1024) {
      setError('Bestand is te groot. Maximum is 5MB.');
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
        setError('Selecteer een standaard avatar.');
        return;
      }
      setMyAvatar(selectedPreset, 'preset');
    } else {
      if (!uploadPreview) {
        setError('Upload een afbeelding eerst.');
        return;
      }
      setMyAvatar(uploadPreview, 'upload');
    }
    setSuccess(true);
    setTimeout(() => onClose(), 1000);
  };

  const handleReset = () => {
    clearMyAvatar();
    setSuccess(true);
    setTimeout(() => onClose(), 1000);
  };

  return (
    <ModalPane title="Profielfoto wijzigen" icon="📸" onClose={onClose} width="480px">
        <div className="modal-body avatar-picker-dialog">
          <div className="avatar-picker-current">
            <img src={currentAvatar} alt="Huidige avatar" className="avatar-picker-preview-img" />
            <div className="avatar-picker-current-label">Huidige foto</div>
          </div>

          <div className="avatar-picker-tabs">
            <button
              className={`avatar-tab-btn ${activeTab === 'preset' ? 'active' : ''}`}
              onClick={() => setActiveTab('preset')}
            >
              Standaard avatars
            </button>
            <button
              className={`avatar-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Eigen foto
            </button>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {activeTab === 'preset' && (
            <div className="avatar-preset-grid">
              {presets.map((key) => (
                <img
                  key={key}
                  src={`/avatars/${key}`}
                  alt={key}
                  className={`avatar-preset-item ${selectedPreset === key ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset(key)}
                />
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="avatar-upload-panel">
              <p className="avatar-upload-hint">
                Kies een foto van uw computer. De foto wordt automatisch bijgesneden tot 110×110 pixels.
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
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {uploadPreview && (
                <div className="avatar-upload-preview">
                  <img src={uploadPreview} alt="Voorbeeld" className="avatar-picker-preview-img" />
                  <div className="avatar-picker-current-label">Voorbeeld (110×110)</div>
                </div>
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">✓ Profielfoto opgeslagen!</div>}

          <div className="form-actions">
            <button className="dx-button primary" onClick={handleSave}>Opslaan</button>
            <button className="dx-button" onClick={handleReset}>Standaard herstellen</button>
            <button className="dx-button" onClick={onClose}>Annuleren</button>
          </div>
        </div>
    </ModalPane>
  );
}

export default AvatarPickerModal;
