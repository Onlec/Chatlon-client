import {
  CHABLO_ACCENT_COLOR_OPTIONS,
  CHABLO_ACCENT_STYLE_OPTIONS,
  CHABLO_BODY_SHAPE_OPTIONS,
  CHABLO_HAIR_COLOR_OPTIONS,
  CHABLO_HAIR_STYLE_OPTIONS,
  CHABLO_SKIN_TONE_OPTIONS
} from './chabloAvatarAppearance';

export const CHABLO_WARDROBE_SECTIONS = [
  { id: 'bodyShape', label: 'Vorm', type: 'shape', options: CHABLO_BODY_SHAPE_OPTIONS },
  { id: 'skinTone', label: 'Huid', type: 'color', options: CHABLO_SKIN_TONE_OPTIONS },
  { id: 'hairStyle', label: 'Haar', type: 'token', options: CHABLO_HAIR_STYLE_OPTIONS },
  { id: 'hairColor', label: 'Haarkleur', type: 'color', options: CHABLO_HAIR_COLOR_OPTIONS },
  { id: 'accentStyle', label: 'Accent', type: 'token', options: CHABLO_ACCENT_STYLE_OPTIONS },
  { id: 'accentColor', label: 'Accentkleur', type: 'color', options: CHABLO_ACCENT_COLOR_OPTIONS }
];
