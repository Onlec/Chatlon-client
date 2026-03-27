import {
  CHABLO_EMOTE_REGISTRY,
  CHABLO_EMOTE_TTL_MS,
  getChabloEmote,
  isChabloEmoteFresh,
  normalizeChabloEmote
} from './chabloEmotes';

describe('chabloEmotes', () => {
  test('exposes the v1 emote registry', () => {
    expect(CHABLO_EMOTE_REGISTRY.map((entry) => entry.type)).toEqual([
      'wave',
      'laugh',
      'shrug',
      'cheer',
      'question',
      'coffee'
    ]);
    expect(getChabloEmote('wave')).toEqual(expect.objectContaining({
      label: 'WAVE',
      buttonLabel: 'Zwaai'
    }));
  });

  test('normalizes valid emotes and fills defaults from the registry', () => {
    expect(normalizeChabloEmote({
      type: 'laugh',
      by: 'alice',
      roomId: 'arcade',
      issuedAt: 1000
    })).toEqual(expect.objectContaining({
      type: 'laugh',
      label: 'LOL',
      by: 'alice',
      roomId: 'arcade',
      expiresAt: 1000 + CHABLO_EMOTE_TTL_MS
    }));
  });

  test('rejects invalid emote types and expired payloads are not fresh', () => {
    expect(normalizeChabloEmote({
      type: 'unknown',
      by: 'alice',
      roomId: 'arcade',
      issuedAt: 1000,
      expiresAt: 1200
    })).toBeNull();

    expect(isChabloEmoteFresh({
      type: 'wave',
      expiresAt: 900
    }, 901)).toBe(false);

    expect(isChabloEmoteFresh({
      type: 'wave',
      expiresAt: 1200
    }, 1100)).toBe(true);
  });
});
