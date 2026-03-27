export const CHABLO_BODY_SHAPE_OPTIONS = [
  { id: 'square', label: 'Square' },
  { id: 'rectangle', label: 'Rechthoek' },
  { id: 'circle', label: 'Cirkel' },
  { id: 'oval', label: 'Ovaal' },
  { id: 'triangle', label: 'Driehoek' },
  { id: 'invertedTriangle', label: 'Omgekeerde driehoek' },
  { id: 'pentagon', label: 'Vijfhoek' },
  { id: 'hexagon', label: 'Zeshoek' }
];

export const CHABLO_SKIN_TONE_OPTIONS = [
  { id: 'porcelain', label: 'Porcelain', color: '#f5d8bf' },
  { id: 'sand', label: 'Sand', color: '#e8c19a' },
  { id: 'olive', label: 'Olive', color: '#c69363' },
  { id: 'cocoa', label: 'Cocoa', color: '#8c5d3d' },
  { id: 'night', label: 'Night', color: '#5f3d2d' }
];

export const CHABLO_HAIR_STYLE_OPTIONS = [
  { id: 'crop', label: 'Crop' },
  { id: 'bob', label: 'Bob' },
  { id: 'parted', label: 'Parted' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'puff', label: 'Puff' },
  { id: 'slick', label: 'Slick' }
];

export const CHABLO_HAIR_COLOR_OPTIONS = [
  { id: 'ink', label: 'Ink', color: '#1a2032' },
  { id: 'espresso', label: 'Espresso', color: '#3d2a26' },
  { id: 'copper', label: 'Copper', color: '#b66a43' },
  { id: 'blonde', label: 'Blonde', color: '#d8bf74' },
  { id: 'mint', label: 'Mint', color: '#7dcfb0' },
  { id: 'violet', label: 'Violet', color: '#8c7be6' }
];

export const CHABLO_TOP_STYLE_OPTIONS = [
  { id: 'tee', label: 'T-shirt' },
  { id: 'jacket', label: 'Jacket' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'vest', label: 'Vest' },
  { id: 'dressshirt', label: 'Dress shirt' }
];

export const CHABLO_TOP_COLOR_OPTIONS = [
  { id: 'midnight', label: 'Midnight', color: '#22304a' },
  { id: 'candy', label: 'Candy', color: '#d86d88' },
  { id: 'teal', label: 'Teal', color: '#3a8891' },
  { id: 'amber', label: 'Amber', color: '#cc8c4b' },
  { id: 'lilac', label: 'Lilac', color: '#9784d6' }
];

export const CHABLO_BOTTOM_STYLE_OPTIONS = [
  { id: 'pants', label: 'Pants' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'skirt', label: 'Skirt' },
  { id: 'flare', label: 'Flare' },
  { id: 'tailored', label: 'Tailored' }
];

export const CHABLO_BOTTOM_COLOR_OPTIONS = [
  { id: 'denim', label: 'Denim', color: '#47608d' },
  { id: 'charcoal', label: 'Charcoal', color: '#353b49' },
  { id: 'khaki', label: 'Khaki', color: '#827056' },
  { id: 'plum', label: 'Plum', color: '#6e4d74' },
  { id: 'sea', label: 'Sea', color: '#3d707c' }
];

export const CHABLO_SHOES_STYLE_OPTIONS = [
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'boots', label: 'Boots' },
  { id: 'loafers', label: 'Loafers' },
  { id: 'slippers', label: 'Slippers' }
];

export const CHABLO_SHOES_COLOR_OPTIONS = [
  { id: 'ink', label: 'Ink', color: '#1f2532' },
  { id: 'cream', label: 'Cream', color: '#d8d0bf' },
  { id: 'rust', label: 'Rust', color: '#955941' },
  { id: 'berry', label: 'Berry', color: '#8c557a' }
];

export const CHABLO_ACCENT_STYLE_OPTIONS = [
  { id: 'none', label: 'Geen' },
  { id: 'badge', label: 'Badge' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'glasses', label: 'Bril' },
  { id: 'satchel', label: 'Tas' }
];

export const CHABLO_ACCENT_COLOR_OPTIONS = [
  { id: 'gold', label: 'Gold', color: '#e3c46f' },
  { id: 'neon', label: 'Neon', color: '#7ee6ff' },
  { id: 'rose', label: 'Rose', color: '#f08cb2' },
  { id: 'forest', label: 'Forest', color: '#78a16d' },
  { id: 'paper', label: 'Paper', color: '#ece3ce' }
];

const BODY_SHAPE_MAP = new Map(CHABLO_BODY_SHAPE_OPTIONS.map((entry) => [entry.id, entry]));
const SKIN_TONE_MAP = new Map(CHABLO_SKIN_TONE_OPTIONS.map((entry) => [entry.id, entry]));
const HAIR_STYLE_MAP = new Map(CHABLO_HAIR_STYLE_OPTIONS.map((entry) => [entry.id, entry]));
const HAIR_COLOR_MAP = new Map(CHABLO_HAIR_COLOR_OPTIONS.map((entry) => [entry.id, entry]));
const TOP_STYLE_MAP = new Map(CHABLO_TOP_STYLE_OPTIONS.map((entry) => [entry.id, entry]));
const TOP_COLOR_MAP = new Map(CHABLO_TOP_COLOR_OPTIONS.map((entry) => [entry.id, entry]));
const BOTTOM_STYLE_MAP = new Map(CHABLO_BOTTOM_STYLE_OPTIONS.map((entry) => [entry.id, entry]));
const BOTTOM_COLOR_MAP = new Map(CHABLO_BOTTOM_COLOR_OPTIONS.map((entry) => [entry.id, entry]));
const SHOES_STYLE_MAP = new Map(CHABLO_SHOES_STYLE_OPTIONS.map((entry) => [entry.id, entry]));
const SHOES_COLOR_MAP = new Map(CHABLO_SHOES_COLOR_OPTIONS.map((entry) => [entry.id, entry]));
const ACCENT_STYLE_MAP = new Map(CHABLO_ACCENT_STYLE_OPTIONS.map((entry) => [entry.id, entry]));
const ACCENT_COLOR_MAP = new Map(CHABLO_ACCENT_COLOR_OPTIONS.map((entry) => [entry.id, entry]));

export const CHABLO_BODY_SHAPE_TEMPLATES = {
  square: {
    primitive: 'rect',
    width: 28,
    height: 28,
    visualOffsetY: 0,
    labelOffsetY: 24,
    hairY: -12,
    topY: -4,
    bottomY: 6,
    shoesY: 14,
    accentY: -2,
    face: {
      down: { x: 0, y: 7, width: 12, height: 4 },
      up: { x: 0, y: -9, width: 12, height: 4 },
      left: { x: -9, y: -1, width: 4, height: 11 },
      right: { x: 9, y: -1, width: 4, height: 11 }
    }
  },
  rectangle: {
    primitive: 'rect',
    width: 24,
    height: 32,
    visualOffsetY: 0,
    labelOffsetY: 27,
    hairY: -14,
    topY: -6,
    bottomY: 7,
    shoesY: 16,
    accentY: -1,
    face: {
      down: { x: 0, y: 8, width: 10, height: 4 },
      up: { x: 0, y: -10, width: 10, height: 4 },
      left: { x: -8, y: -1, width: 4, height: 12 },
      right: { x: 8, y: -1, width: 4, height: 12 }
    }
  },
  circle: {
    primitive: 'ellipse',
    width: 30,
    height: 30,
    visualOffsetY: 0,
    labelOffsetY: 25,
    hairY: -12,
    topY: -5,
    bottomY: 7,
    shoesY: 15,
    accentY: -3,
    face: {
      down: { x: 0, y: 7, width: 11, height: 4 },
      up: { x: 0, y: -8, width: 11, height: 4 },
      left: { x: -9, y: -1, width: 4, height: 10 },
      right: { x: 9, y: -1, width: 4, height: 10 }
    }
  },
  oval: {
    primitive: 'ellipse',
    width: 24,
    height: 34,
    visualOffsetY: 0,
    labelOffsetY: 28,
    hairY: -15,
    topY: -7,
    bottomY: 8,
    shoesY: 16,
    accentY: -2,
    face: {
      down: { x: 0, y: 8, width: 10, height: 4 },
      up: { x: 0, y: -10, width: 10, height: 4 },
      left: { x: -8, y: -1, width: 4, height: 12 },
      right: { x: 8, y: -1, width: 4, height: 12 }
    }
  },
  triangle: {
    primitive: 'triangle',
    width: 30,
    height: 30,
    visualOffsetY: 0,
    labelOffsetY: 26,
    hairY: -14,
    topY: -5,
    bottomY: 8,
    shoesY: 15,
    accentY: 0,
    face: {
      down: { x: 0, y: 6, width: 10, height: 4 },
      up: { x: 0, y: -7, width: 10, height: 4 },
      left: { x: -7, y: -1, width: 4, height: 10 },
      right: { x: 7, y: -1, width: 4, height: 10 }
    }
  },
  invertedTriangle: {
    primitive: 'triangle-inverted',
    width: 30,
    height: 30,
    visualOffsetY: 0,
    labelOffsetY: 26,
    hairY: -12,
    topY: -3,
    bottomY: 8,
    shoesY: 15,
    accentY: 2,
    face: {
      down: { x: 0, y: 5, width: 10, height: 4 },
      up: { x: 0, y: -7, width: 10, height: 4 },
      left: { x: -7, y: 1, width: 4, height: 10 },
      right: { x: 7, y: 1, width: 4, height: 10 }
    }
  },
  pentagon: {
    primitive: 'pentagon',
    width: 30,
    height: 32,
    visualOffsetY: 0,
    labelOffsetY: 27,
    hairY: -14,
    topY: -5,
    bottomY: 7,
    shoesY: 15,
    accentY: -2,
    face: {
      down: { x: 0, y: 7, width: 10, height: 4 },
      up: { x: 0, y: -9, width: 10, height: 4 },
      left: { x: -8, y: -1, width: 4, height: 10 },
      right: { x: 8, y: -1, width: 4, height: 10 }
    }
  },
  hexagon: {
    primitive: 'hexagon',
    width: 32,
    height: 30,
    visualOffsetY: 0,
    labelOffsetY: 26,
    hairY: -13,
    topY: -4,
    bottomY: 7,
    shoesY: 15,
    accentY: -2,
    face: {
      down: { x: 0, y: 7, width: 11, height: 4 },
      up: { x: 0, y: -8, width: 11, height: 4 },
      left: { x: -9, y: -1, width: 4, height: 10 },
      right: { x: 9, y: -1, width: 4, height: 10 }
    }
  }
};

export const DEFAULT_CHABLO_AVATAR_APPEARANCE = {
  version: 1,
  bodyShape: 'square',
  skinTone: 'sand',
  hairStyle: 'crop',
  hairColor: 'ink',
  topStyle: 'tee',
  topColor: 'midnight',
  bottomStyle: 'pants',
  bottomColor: 'denim',
  shoesStyle: 'sneakers',
  shoesColor: 'ink',
  accentStyle: 'none',
  accentColor: 'gold',
  updatedAt: 0
};

function hashSeed(seed) {
  const source = String(seed || 'guest');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickOption(options, seed, salt) {
  const hash = hashSeed(`${seed}:${salt}`);
  return options[hash % options.length];
}

function pickValid(map, value, fallbackValue) {
  return map.has(value) ? value : fallbackValue;
}

export function createDefaultChabloAvatarAppearance(seed = 'guest') {
  return {
    version: 1,
    bodyShape: pickOption(CHABLO_BODY_SHAPE_OPTIONS, seed, 'body').id,
    skinTone: pickOption(CHABLO_SKIN_TONE_OPTIONS, seed, 'skin').id,
    hairStyle: pickOption(CHABLO_HAIR_STYLE_OPTIONS, seed, 'hair-style').id,
    hairColor: pickOption(CHABLO_HAIR_COLOR_OPTIONS, seed, 'hair-color').id,
    topStyle: pickOption(CHABLO_TOP_STYLE_OPTIONS, seed, 'top-style').id,
    topColor: pickOption(CHABLO_TOP_COLOR_OPTIONS, seed, 'top-color').id,
    bottomStyle: pickOption(CHABLO_BOTTOM_STYLE_OPTIONS, seed, 'bottom-style').id,
    bottomColor: pickOption(CHABLO_BOTTOM_COLOR_OPTIONS, seed, 'bottom-color').id,
    shoesStyle: pickOption(CHABLO_SHOES_STYLE_OPTIONS, seed, 'shoes-style').id,
    shoesColor: pickOption(CHABLO_SHOES_COLOR_OPTIONS, seed, 'shoes-color').id,
    accentStyle: pickOption(CHABLO_ACCENT_STYLE_OPTIONS, seed, 'accent-style').id,
    accentColor: pickOption(CHABLO_ACCENT_COLOR_OPTIONS, seed, 'accent-color').id,
    updatedAt: 0
  };
}

export function createRandomChabloAvatarAppearance(seed = Date.now()) {
  return {
    ...createDefaultChabloAvatarAppearance(seed),
    updatedAt: Number(seed) || Date.now()
  };
}

export function normalizeChabloAvatarAppearance(record, seed = 'guest') {
  const fallback = createDefaultChabloAvatarAppearance(seed);
  const source = record && typeof record === 'object' ? record : {};

  return {
    version: 1,
    bodyShape: pickValid(BODY_SHAPE_MAP, source.bodyShape, DEFAULT_CHABLO_AVATAR_APPEARANCE.bodyShape),
    skinTone: pickValid(SKIN_TONE_MAP, source.skinTone, fallback.skinTone),
    hairStyle: pickValid(HAIR_STYLE_MAP, source.hairStyle, fallback.hairStyle),
    hairColor: pickValid(HAIR_COLOR_MAP, source.hairColor, fallback.hairColor),
    topStyle: pickValid(TOP_STYLE_MAP, source.topStyle, fallback.topStyle),
    topColor: pickValid(TOP_COLOR_MAP, source.topColor, fallback.topColor),
    bottomStyle: pickValid(BOTTOM_STYLE_MAP, source.bottomStyle, fallback.bottomStyle),
    bottomColor: pickValid(BOTTOM_COLOR_MAP, source.bottomColor, fallback.bottomColor),
    shoesStyle: pickValid(SHOES_STYLE_MAP, source.shoesStyle, fallback.shoesStyle),
    shoesColor: pickValid(SHOES_COLOR_MAP, source.shoesColor, fallback.shoesColor),
    accentStyle: pickValid(ACCENT_STYLE_MAP, source.accentStyle, fallback.accentStyle),
    accentColor: pickValid(ACCENT_COLOR_MAP, source.accentColor, fallback.accentColor),
    updatedAt: Number(source.updatedAt) || 0
  };
}

export function getChabloAvatarAppearanceSignature(appearance) {
  const normalized = normalizeChabloAvatarAppearance(appearance);
  return [
    normalized.bodyShape,
    normalized.skinTone,
    normalized.hairStyle,
    normalized.hairColor,
    normalized.topStyle,
    normalized.topColor,
    normalized.bottomStyle,
    normalized.bottomColor,
    normalized.shoesStyle,
    normalized.shoesColor,
    normalized.accentStyle,
    normalized.accentColor
  ].join('|');
}

export function getChabloAvatarColor(slot, token) {
  const registries = {
    skinTone: SKIN_TONE_MAP,
    hairColor: HAIR_COLOR_MAP,
    topColor: TOP_COLOR_MAP,
    bottomColor: BOTTOM_COLOR_MAP,
    shoesColor: SHOES_COLOR_MAP,
    accentColor: ACCENT_COLOR_MAP
  };

  return registries[slot]?.get(token)?.color || '#ffffff';
}

export default normalizeChabloAvatarAppearance;
