import { createAvatarManager } from './avatars';

function createShapeMock() {
  return {
    setStrokeStyle: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setFillStyle: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setSize: jest.fn().mockReturnThis(),
    setOrigin: jest.fn().mockReturnThis(),
    destroy: jest.fn()
  };
}

function createTextMock() {
  return {
    setOrigin: jest.fn().mockReturnThis(),
    setPosition: jest.fn().mockReturnThis(),
    setText: jest.fn().mockReturnThis(),
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
    setScale: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    removeAll: jest.fn().mockReturnThis(),
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
      rectangle: jest.fn(() => createShapeMock()),
      ellipse: jest.fn(() => createShapeMock()),
      triangle: jest.fn(() => createShapeMock()),
      polygon: jest.fn(() => createShapeMock()),
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
    const { scene, tweenResults, Phaser } = createSceneMock();
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
    expect(manager.get('alice')?.container.setPosition).toHaveBeenCalledWith(10, 20);
    expect(scene.tweens.add).not.toHaveBeenCalled();

    manager.sync([{ username: 'alice', x: 20, y: 20, isSelf: true }], null, getAvatarPosition);
    expect(scene.tweens.add).toHaveBeenCalledTimes(1);
    expect(tweenResults[0].stop).not.toHaveBeenCalled();

    manager.sync([{ username: 'alice', x: 20, y: 20, isSelf: true }], null, getAvatarPosition);
    expect(scene.tweens.add).toHaveBeenCalledTimes(1);
    expect(tweenResults[0].stop).not.toHaveBeenCalled();
    expect(manager.get('alice')?.container.setPosition).toHaveBeenCalledTimes(1);
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

    manager.sync([{ username: 'bob', x: 10, y: 20, isSelf: false }], null, getAvatarPosition);
    manager.sync(
      [{ username: 'bob', x: 220, y: 20, isSelf: false }],
      null,
      getAvatarPosition,
      { remoteSnapDistancePx: 60 }
    );

    expect(scene.tweens.add).not.toHaveBeenCalled();
    expect(manager.get('bob')?.container.setPosition).toHaveBeenNthCalledWith(1, 10, 20);
    expect(manager.get('bob')?.container.setPosition).toHaveBeenNthCalledWith(2, 220, 20);
  });

  test('renders and replaces emote bubbles on avatar containers', () => {
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

    manager.sync(
      [{ username: 'alice', x: 10, y: 20, isSelf: true }],
      null,
      getAvatarPosition,
      {
        activeEmotesByUsername: {
          alice: {
            type: 'wave',
            label: 'WAVE',
            color: '#8fd4ff',
            by: 'alice',
            roomId: 'receptie',
            issuedAt: Date.now(),
            expiresAt: Date.now() + 2400
          }
        }
      }
    );

    const avatar = manager.get('alice');
    expect(avatar.emoteLabel.setText).toHaveBeenCalledWith('WAVE');
    expect(scene.tweens.add).toHaveBeenCalled();
    const firstEmoteTween = avatar.activeEmoteTween;

    manager.sync(
      [{ username: 'alice', x: 10, y: 20, isSelf: true }],
      null,
      getAvatarPosition,
      {
        activeEmotesByUsername: {
          alice: {
            type: 'cheer',
            label: 'YEAH',
            color: '#8cf5c6',
            by: 'alice',
            roomId: 'receptie',
            issuedAt: Date.now() + 1,
            expiresAt: Date.now() + 2401
          }
        }
      }
    );

    expect(firstEmoteTween.stop).toHaveBeenCalled();
    expect(avatar.emoteLabel.setText).toHaveBeenLastCalledWith('YEAH');

    manager.sync(
      [{ username: 'alice', x: 10, y: 20, isSelf: true }],
      null,
      getAvatarPosition,
      { activeEmotesByUsername: {} }
    );

    expect(avatar.emoteLabel.setText).toHaveBeenLastCalledWith('');
  });

  test.each([
    ['square', 'rectangle'],
    ['rectangle', 'rectangle'],
    ['circle', 'ellipse'],
    ['oval', 'ellipse'],
    ['triangle', 'triangle'],
    ['invertedTriangle', 'triangle'],
    ['pentagon', 'polygon'],
    ['hexagon', 'polygon']
  ])('renders the %s avatar body shape without breaking anchors', (bodyShape, primitiveMethod) => {
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

    expect(() => manager.sync(
      [{ username: 'alice', x: 10, y: 20, isSelf: true }],
      null,
      getAvatarPosition,
      {
        appearanceByUsername: {
          alice: {
            bodyShape,
            updatedAt: 1
          }
        }
      }
    )).not.toThrow();

    expect(scene.add[primitiveMethod]).toHaveBeenCalled();
    expect(manager.get('alice')?.labelBg.setPosition).toHaveBeenCalled();
    expect(manager.get('alice')?.emoteContainer.setPosition).toHaveBeenCalled();
  });
});
