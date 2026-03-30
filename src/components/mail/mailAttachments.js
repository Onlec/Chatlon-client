// src/components/mail/mailAttachments.js

export const MAX_ATTACHMENT_SIZE = 500 * 1024; // 500 KB

/**
 * Normaliseer een attachment-lijst uit legacy string-opslag of moderne arrays.
 * @param {string|Array|null|undefined} value
 * @returns {Array}
 */
export function parseMailAttachments(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string') return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Serialiseer attachment-data compatibel met bestaande Gun-opslag.
 * @param {string|Array|null|undefined} value
 * @returns {string|null}
 */
export function serializeMailAttachments(value) {
  const attachments = parseMailAttachments(value);
  return attachments.length > 0 ? JSON.stringify(attachments) : null;
}

/**
 * Lees een bestand als base64 data URL.
 * @param {File} file
 * @returns {Promise<string>} data URL
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Bestand kon niet worden gelezen'));
    reader.readAsDataURL(file);
  });
}

/**
 * Formatteer bestandsgrootte naar leesbare string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Geef een emoji icoon terug op basis van MIME type.
 * @param {string} mimeType
 * @returns {string}
 */
export function mimeIcon(mimeType) {
  if (!mimeType) return '📎';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
  if (mimeType.startsWith('text/')) return '📝';
  return '📎';
}
