import {
  CHABLO_ACCENT_COLOR_OPTIONS,
  CHABLO_ACCENT_STYLE_OPTIONS,
  CHABLO_BODY_SHAPE_OPTIONS,
  CHABLO_BOTTOM_COLOR_OPTIONS,
  CHABLO_BOTTOM_STYLE_OPTIONS,
  CHABLO_HAIR_COLOR_OPTIONS,
  CHABLO_HAIR_STYLE_OPTIONS,
  CHABLO_SHOES_COLOR_OPTIONS,
  CHABLO_SHOES_STYLE_OPTIONS,
  CHABLO_SKIN_TONE_OPTIONS,
  CHABLO_TOP_COLOR_OPTIONS,
  CHABLO_TOP_STYLE_OPTIONS,
  createDefaultChabloAvatarAppearance,
  createRandomChabloAvatarAppearance,
  normalizeChabloAvatarAppearance
} from './chabloAvatarAppearance';

function expectAppearanceToUseKnownTokens(appearance) {
  expect(CHABLO_BODY_SHAPE_OPTIONS.map((entry) => entry.id)).toContain(appearance.bodyShape);
  expect(CHABLO_SKIN_TONE_OPTIONS.map((entry) => entry.id)).toContain(appearance.skinTone);
  expect(CHABLO_HAIR_STYLE_OPTIONS.map((entry) => entry.id)).toContain(appearance.hairStyle);
  expect(CHABLO_HAIR_COLOR_OPTIONS.map((entry) => entry.id)).toContain(appearance.hairColor);
  expect(CHABLO_TOP_STYLE_OPTIONS.map((entry) => entry.id)).toContain(appearance.topStyle);
  expect(CHABLO_TOP_COLOR_OPTIONS.map((entry) => entry.id)).toContain(appearance.topColor);
  expect(CHABLO_BOTTOM_STYLE_OPTIONS.map((entry) => entry.id)).toContain(appearance.bottomStyle);
  expect(CHABLO_BOTTOM_COLOR_OPTIONS.map((entry) => entry.id)).toContain(appearance.bottomColor);
  expect(CHABLO_SHOES_STYLE_OPTIONS.map((entry) => entry.id)).toContain(appearance.shoesStyle);
  expect(CHABLO_SHOES_COLOR_OPTIONS.map((entry) => entry.id)).toContain(appearance.shoesColor);
  expect(CHABLO_ACCENT_STYLE_OPTIONS.map((entry) => entry.id)).toContain(appearance.accentStyle);
  expect(CHABLO_ACCENT_COLOR_OPTIONS.map((entry) => entry.id)).toContain(appearance.accentColor);
}

describe('chabloAvatarAppearance', () => {
  test('falls back to square when an unknown body shape is supplied', () => {
    const appearance = normalizeChabloAvatarAppearance({
      bodyShape: 'octagon',
      hairStyle: 'mohawk',
      updatedAt: 33
    }, 'alice');

    expect(appearance.bodyShape).toBe('square');
    expect(appearance.hairStyle).toBe('mohawk');
    expect(appearance.updatedAt).toBe(33);
  });

  test('creates a stable seeded default appearance', () => {
    const first = createDefaultChabloAvatarAppearance('alice');
    const second = createDefaultChabloAvatarAppearance('alice');

    expect(first).toEqual(second);
    expectAppearanceToUseKnownTokens(first);
  });

  test.each(['triangle', 'invertedTriangle', 'pentagon', 'hexagon'])(
    'keeps the supported %s shape during normalization',
    (bodyShape) => {
      const appearance = normalizeChabloAvatarAppearance({ bodyShape }, 'alice');

      expect(appearance.bodyShape).toBe(bodyShape);
    }
  );

  test('creates valid randomized appearances', () => {
    const appearance = createRandomChabloAvatarAppearance('alice:1234');

    expectAppearanceToUseKnownTokens(appearance);
    expect(typeof appearance.updatedAt).toBe('number');
  });
});
