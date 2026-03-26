import { createAvatarManager } from './avatars';

function createRectangleMock() {
  return {
    setStrokeStyle: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setFillStyle: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setSize: jest.fn().mockReturnThis(),
    setOrigin: jest.fn().mockReturnThis()
  };
}

function createTextMock() {
  return {
    setOrigin: jest.fn().mockReturnThis(),
    destroy: jest.fn()
  };
}

function createContainerMock() {
  return {
    setSize: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    destroy: jest.fn()
  };
}

function createSceneMock() {
  const firstContainer = createContainerMock();
  const containers = [firstContainer];
  const tweenResults = [];
  let firstContainerUsed = false;

  const Rectangle = function Rectangle() {};
  Rectangle.Contains = jest.fn();

  const scene = {
    add: {
      rectangle: jest.fn(() => createRectangleMock()),
      text: jest.fn(() => createTextMock()),
      container: jest.fn(() => {
        if (!firstContainerUsed) {
          firstContainerUsed = true;
          return firstContainer;
        }
        const container = createContainerMock();
        containers.push(container);
        return container;
      })
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
    container: firstContainer,
    containers,
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

  test('reports join and leave presence events for remote avatars and updates facing', () => {
    const { scene, Phaser } = createSceneMock();
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

    const joined = manager.sync(
      [{ username: 'bob', x: 40, y: 20, isSelf: false }],
      null,
      getAvatarPosition,
      { presenceEventsEnabled: true }
    );

    expect(joined).toEqual({ joined: ['bob'], left: [] });
    expect(manager.get('bob')?.facing).toBe('down');

    const moved = manager.sync(
      [{ username: 'bob', x: 88, y: 20, isSelf: false }],
      null,
      getAvatarPosition,
      { presenceEventsEnabled: true, remoteSnapDistancePx: 999 }
    );

    expect(moved).toEqual({ joined: [], left: [] });
    expect(manager.get('bob')?.facing).toBe('right');

    const left = manager.sync([], null, getAvatarPosition, { presenceEventsEnabled: true });
    expect(left).toEqual({ joined: [], left: ['bob'] });
  });

  test('snaps remote avatars on large jumps instead of tweening them across the room', () => {
    const { scene, containers, Phaser } = createSceneMock();
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

    manager.sync([{ username: 'bob', x: 10, y: 20, isSelf: false }], null, getAvatarPosition);
    manager.sync(
      [{ username: 'bob', x: 220, y: 20, isSelf: false }],
      null,
      getAvatarPosition,
      { remoteSnapDistancePx: 60 }
    );

    expect(scene.tweens.add).not.toHaveBeenCalled();
    expect(containers[0].setPosition).toHaveBeenNthCalledWith(1, 10, 20);
    expect(containers[0].setPosition).toHaveBeenNthCalledWith(2, 220, 20);
  });
});
