// src/components/shared/RichTextRenderer.js

import React from 'react';
import { deserializeRich } from '../../utils/richText';

/**
 * Rendert een RichSpan[] (of backwards-compatible string) als React elementen.
 * Geen dangerouslySetInnerHTML, geen HTML, geen externe dependencies.
 */
function RichTextRenderer({ value, className }) {
  const spans = deserializeRich(value);

  return (
    <span className={className}>
      {spans.map((span, i) => {
        const style = {};
        if (span.color)     style.color          = span.color;
        if (span.font)      style.fontFamily      = span.font;
        if (span.size)      style.fontSize        = `${span.size}px`;
        if (span.bold)      style.fontWeight      = 'bold';
        if (span.italic)    style.fontStyle       = 'italic';
        if (span.underline) style.textDecoration  = 'underline';
        return <span key={i} style={style}>{span.text}</span>;
      })}
    </span>
  );
}

export default RichTextRenderer;
