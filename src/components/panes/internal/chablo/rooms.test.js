import { CHABLO_ROOMS } from './rooms';

function isIntegerLike(value) {
  return Number.isInteger(value);
}

describe('Chablo room decor config', () => {
  test('keeps decor aligned to integer tile coordinates', () => {
    CHABLO_ROOMS.forEach((room) => {
      (room.decor || []).forEach((item) => {
        if (typeof item.x === 'number') {
          expect(isIntegerLike(item.x)).toBe(true);
        }
        if (typeof item.y === 'number') {
          expect(isIntegerLike(item.y)).toBe(true);
        }
        if (typeof item.width === 'number') {
          expect(isIntegerLike(item.width)).toBe(true);
        }
        if (typeof item.height === 'number') {
          expect(isIntegerLike(item.height)).toBe(true);
        }
        if (Array.isArray(item.positions)) {
          item.positions.forEach((position) => {
            expect(isIntegerLike(position.x)).toBe(true);
            expect(isIntegerLike(position.y)).toBe(true);
          });
        }
      });
    });
  });
});
