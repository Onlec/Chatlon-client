import {
  buildLunaCustomThemeStyle,
  DEFAULT_LUNA_CUSTOM_SEED,
  LUNA_CUSTOM_THEME_ID,
  normalizeHexColor,
} from './lunaCustomTheme';

describe('lunaCustomTheme', () => {
  test('normalizes valid hex colors and falls back for invalid input', () => {
    expect(normalizeHexColor('#ABC')).toBe('#aabbcc');
    expect(normalizeHexColor('334455')).toBe('#334455');
    expect(normalizeHexColor('not-a-color')).toBe(DEFAULT_LUNA_CUSTOM_SEED);
  });

  test('only builds runtime CSS vars for the luna custom theme', () => {
    expect(buildLunaCustomThemeStyle('blauw', { seed: '#123456' })).toBeUndefined();
    expect(buildLunaCustomThemeStyle(LUNA_CUSTOM_THEME_ID, { seed: '#123456' })).toEqual({
      '--custom-luna-seed': '#123456',
    });
  });
});
