import { createAvatarManager } from './avatars';

function createRectangleMock() {
  return {
    setStrokeStyle: jest.fn(),
    setScale: jest.fn(),
    setAlpha: jest.fn(),
    setFillStyle: jest.fn()
  };
}

function createTextMock() {
  return {
    setOrigin: jest.fn().mockReturnThis()
  };
}

function createContainerMock() {
  return {
    setSize: jest.fn(),
    setInteractive: jest.fn(),
    on: jest.fn(),
    setPosition: jest.fn(),
    destroy: jest.fn()
  };
}

function createSceneMock() {
  const container = createContainerMock();
  const tweenResults = [];

  const Rectangle = function Rectangle() {};
  Rectangle.Contains = jest.fn();

  const scene = {
    add: {
      rectangle: jest.fn(() => createRectangleMock()),
      text: jest.fn(() => createTextMock()),
      container: jest.fn(() => container)
    },
    tweens: {
      add: jest.fn((config) => {
        const tween = {
          config,
          stop: jest.fn()
        };
        tweenResults.push(tween);
        return tween;
      })
    }
  };

  return {
    scene,
    container,
    tweenResults,
    Phaser: {
      Geom: {
        Rectangle
      }
    }
  };
}

describe('createAvatarManager', () => {
  test('keeps the local tween alive when the same target position is synced again', () => {
    const { scene, container, tweenResults, Phaser } = createSceneMock();
    const layer = { add: jest.fn() };
    const manager = createAvatarManager({
      scene,
      Phaser,
      layer,
      onSelectAvatar: jest.fn(),
      tweenMs: 140,
      remoteTweenMs: 170
    });
    const getAvatarPosition = (occupant) => ({ x: occupant.x, y: occupant.y });

    manager.sync([{ username: 'alice', x: 10, y: 20, isSelf: true }], null, getAvatarPosition);
    expect(container.setPosition).toHaveBeenCalledWith(10, 20);
    expect(scene.tweens.add).not.toHaveBeenCalled();

    manager.sync([{ username: 'alice', x: 20, y: 20, isSelf: true }], null, getAvatarPosition);
    expect(scene.tweens.add).toHaveBeenCalledTimes(1);
    expect(tweenResults[0].stop).not.toHaveBeenCalled();

    manager.sync([{ username: 'alice', x: 20, y: 20, isSelf: true }], null, getAvatarPosition);
    expect(scene.tweens.add).toHaveBeenCalledTimes(1);
    expect(tweenResults[0].stop).not.toHaveBeenCalled();
    expect(container.setPosition).toHaveBeenCalledTimes(1);
  });
});
