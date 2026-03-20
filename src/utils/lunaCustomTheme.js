export const LUNA_CUSTOM_THEME_ID = 'luna-custom';
export const DEFAULT_LUNA_CUSTOM_SEED = '#0057e5';
export const DEFAULT_LUNA_CUSTOM_THEME = Object.freeze({
  seed: DEFAULT_LUNA_CUSTOM_SEED,
});

function normalizeHexColorInternal(value) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/^#/, '').toLowerCase();

  if (/^[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized.split('').map((char) => `${char}${char}`).join('')}`;
  }

  if (/^[0-9a-f]{6}$/.test(normalized)) {
    return `#${normalized}`;
  }

  return null;
}

export function isValidHexColor(value) {
  return normalizeHexColorInternal(value) !== null;
}

export function normalizeHexColor(value, fallback = DEFAULT_LUNA_CUSTOM_SEED) {
  const normalizedFallback =
    normalizeHexColorInternal(fallback) || DEFAULT_LUNA_CUSTOM_SEED;

  return normalizeHexColorInternal(value) || normalizedFallback;
}

export function normalizeCustomLunaTheme(theme) {
  const nextTheme = theme && typeof theme === 'object' ? theme : {};

  return {
    ...DEFAULT_LUNA_CUSTOM_THEME,
    ...nextTheme,
    seed: normalizeHexColor(nextTheme.seed, DEFAULT_LUNA_CUSTOM_SEED),
  };
}

export function buildLunaCustomThemeStyle(colorScheme, customLunaTheme) {
  if (colorScheme !== LUNA_CUSTOM_THEME_ID) {
    return undefined;
  }

  const { seed } = normalizeCustomLunaTheme(customLunaTheme);

  return {
    '--custom-luna-seed': seed,
  };
}
