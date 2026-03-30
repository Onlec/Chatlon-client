// src/utils/richText.js

/**
 * Een RichSpan beschrijft één stuk tekst met opmaak.
 * Alle opmaakattributen zijn optioneel — afwezigheid = geen opmaak.
 *
 * @typedef {Object} RichSpan
 * @property {string} text       - De tekst van dit stuk
 * @property {boolean} [bold]
 * @property {boolean} [italic]
 * @property {boolean} [underline]
 * @property {string}  [color]   - CSS kleurwaarde, bijv. '#ff0000'
 * @property {string}  [font]    - Lettertypenaam, bijv. 'Comic Sans MS'
 * @property {number}  [size]    - Tekstgrootte in px, bijv. 14
 */

/**
 * Serialiseer spans naar een Gun-veilige string.
 * @param {RichSpan[]} spans
 * @returns {string}
 */
export function serializeRich(spans) {
  return JSON.stringify(spans);
}

/**
 * Deserialiseer een string terug naar spans.
 * Backwards compatible: een gewone string wordt één span zonder opmaak.
 * @param {string} value
 * @returns {RichSpan[]}
 */
export function deserializeRich(value) {
  if (!value) return [{ text: '' }];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Geen JSON — gewone string (backwards compatible met bestaande berichten)
  }
  return [{ text: String(value) }];
}

/**
 * Extraheer platte tekst uit spans (voor toast previews, etc.).
 * @param {RichSpan[]} spans
 * @returns {string}
 */
export function richToPlainText(spans) {
  return spans.map(s => s.text).join('');
}
