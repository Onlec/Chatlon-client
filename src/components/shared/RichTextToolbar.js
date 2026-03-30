// src/components/shared/RichTextToolbar.js

import React from 'react';

const FONTS = ['Tahoma', 'Arial', 'Times New Roman', 'Courier New', 'Comic Sans MS'];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

function RichTextToolbar({ activeFormat, onFormat }) {
  return (
    <div className="rich-toolbar">
      <button
        type="button"
        className={`rich-toolbar__btn${activeFormat.bold ? ' rich-toolbar__btn--active' : ''}`}
        onClick={() => onFormat('bold')}
        title="Vet"
      ><b>B</b></button>

      <button
        type="button"
        className={`rich-toolbar__btn${activeFormat.italic ? ' rich-toolbar__btn--active' : ''}`}
        onClick={() => onFormat('italic')}
        title="Cursief"
      ><i>I</i></button>

      <button
        type="button"
        className={`rich-toolbar__btn${activeFormat.underline ? ' rich-toolbar__btn--active' : ''}`}
        onClick={() => onFormat('underline')}
        title="Onderstrepen"
      ><u>U</u></button>

      <input
        type="color"
        className="rich-toolbar__color"
        value={activeFormat.color || '#000000'}
        onChange={(e) => onFormat('color', e.target.value)}
        title="Tekstkleur"
      />

      <select
        className="rich-toolbar__select"
        value={activeFormat.font || 'Tahoma'}
        onChange={(e) => onFormat('font', e.target.value)}
      >
        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      <select
        className="rich-toolbar__select rich-toolbar__select--size"
        value={activeFormat.size || 10}
        onChange={(e) => onFormat('size', Number(e.target.value))}
      >
        {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

export default RichTextToolbar;
