// src/components/shared/RichTextEditor.js

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { serializeRich, deserializeRich } from '../../utils/richText';
import RichTextToolbar from './RichTextToolbar';

// ─── RichSpan[] → HTML string ───────────────────────────────────────────────

function spanToHtml(span) {
  const text = (span.text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const styles = [];
  if (span.color) styles.push(`color:${span.color}`);
  if (span.font)  styles.push(`font-family:${span.font}`);
  if (span.size)  styles.push(`font-size:${span.size}px`);

  let content = styles.length
    ? `<span style="${styles.join(';')}">${text}</span>`
    : text;

  if (span.underline) content = `<u>${content}</u>`;
  if (span.italic)    content = `<em>${content}</em>`;
  if (span.bold)      content = `<strong>${content}</strong>`;
  return content;
}

function spansToHtml(spans) {
  return spans.map(spanToHtml).join('');
}

// ─── contenteditable DOM → RichSpan[] ───────────────────────────────────────

function extractSpansFromDOM(container) {
  const spans = [];

  function walk(node, fmt) {
    if (node.nodeType === 3) {
      // text node
      if (node.textContent) spans.push({ text: node.textContent, ...fmt });
      return;
    }
    if (node.nodeType !== 1) return;

    const tag = node.tagName.toUpperCase();

    if (tag === 'BR') {
      spans.push({ text: '\n', ...fmt });
      return;
    }

    // Block elements (div, p) generate a newline before their content
    const isBlock = tag === 'DIV' || tag === 'P';
    if (isBlock && spans.length > 0) {
      const last = spans[spans.length - 1];
      if (!last.text.endsWith('\n')) {
        spans.push({ text: '\n', ...fmt });
      }
    }

    const f = { ...fmt };
    if (tag === 'STRONG' || tag === 'B') f.bold = true;
    if (tag === 'EM'     || tag === 'I') f.italic = true;
    if (tag === 'U')                      f.underline = true;

    // <font> tags: oudere browsers gebruiken die voor foreColor/fontName
    if (tag === 'FONT') {
      if (node.color) f.color = node.color;
      if (node.face)  f.font  = node.face;
    }

    const s = node.style;
    if (s.color)      f.color = s.color;
    if (s.fontFamily) f.font  = s.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
    if (s.fontSize)   f.size  = parseInt(s.fontSize);

    for (const child of node.childNodes) walk(child, f);
  }

  walk(container, {});

  // Verwijder trailing newline die browsers soms toevoegen
  if (spans.length > 0) {
    const last = spans[spans.length - 1];
    if (last.text === '\n') spans.pop();
  }

  return spans.length ? spans : [{ text: '' }];
}

// ─── Component ───────────────────────────────────────────────────────────────

function RichTextEditor({ value, onChange, placeholder, disabled }) {
  const editorRef     = useRef(null);
  const lastValueRef  = useRef(value);
  const fromUserRef   = useRef(false);

  // Actieve staat voor toolbar (bold/italic/underline)
  const [activeFormat, setActiveFormat] = useState({});

  // Lees actieve opmaak van huidige selectie (via execCommand queryState)
  const syncActiveFormat = useCallback(() => {
    try {
      setActiveFormat({
        bold:      document.queryCommandState('bold'),
        italic:    document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      });
    } catch { /* geen focus */ }
  }, []);

  // Luister naar selectiewijzigingen (ook zonder focus-events)
  useEffect(() => {
    document.addEventListener('selectionchange', syncActiveFormat);
    return () => document.removeEventListener('selectionchange', syncActiveFormat);
  }, [syncActiveFormat]);

  // Initieel: zet HTML in de div
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = spansToHtml(deserializeRich(value));
      lastValueRef.current = value;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Externe value-update (bijv. reply/forward pre-fill) — NIET bij eigen input
  useEffect(() => {
    if (fromUserRef.current) { fromUserRef.current = false; return; }
    if (value === lastValueRef.current) return;
    if (editorRef.current) {
      lastValueRef.current = value;
      editorRef.current.innerHTML = spansToHtml(deserializeRich(value));
    }
  }, [value]);

  // User typt: DOM → RichSpan[] → serialize → onChange
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    fromUserRef.current = true;
    const spans      = extractSpansFromDOM(editorRef.current);
    const serialized = serializeRich(spans);
    lastValueRef.current = serialized;
    onChange(serialized);
  }, [onChange]);

  // Toolbar actie: focus editor, voer execCommand uit, sync
  const handleFormat = useCallback((key, val) => {
    if (!editorRef.current || disabled) return;
    editorRef.current.focus();

    switch (key) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'color':
        document.execCommand('foreColor', false, val);
        break;
      case 'font':
        document.execCommand('fontName', false, val);
        break;
      case 'size': {
        // execCommand fontSize gebruikt schaal 1-7, niet px — gebruik span
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (!range.collapsed) {
            const span = document.createElement('span');
            span.style.fontSize = `${val}px`;
            try { range.surroundContents(span); } catch { /* cross-element selectie */ }
          }
        }
        break;
      }
      default:
        break;
    }

    syncActiveFormat();
    handleInput();
  }, [disabled, handleInput, syncActiveFormat]);

  return (
    <div className="rich-editor">
      <RichTextToolbar activeFormat={activeFormat} onFormat={handleFormat} />
      <div
        ref={editorRef}
        className={`rich-editor__content${disabled ? ' rich-editor__content--disabled' : ''}`}
        contentEditable={disabled ? 'false' : 'true'}
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
      />
    </div>
  );
}

export default RichTextEditor;
