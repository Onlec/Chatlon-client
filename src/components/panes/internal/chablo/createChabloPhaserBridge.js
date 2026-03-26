import { createAvatarManager } from './avatars';
import { drawChabloRoom, STAGE_PADDING, TILE_SIZE } from './graphics';
import { getChabloRoom } from './rooms';
import { STEP_TWEEN_MS } from './useChabloMovementController';

const ROOM_TRANSITION_MS = 220;

function getAvatarPosition(tile) {
  return {
    x: STAGE_PADDING + (tile.x * TILE_SIZE) + TILE_SIZE / 2,
    y: STAGE_PADDING + (tile.y * TILE_SIZE) + TILE_SIZE / 2
  };
}

function getRoomStateKey(roomStateByHotspotId = {}) {
  return Object.values(roomStateByHotspotId)
    .map((entry) => `${entry.hotspotId}:${entry.updatedAt || 0}:${entry.text || ''}`)
    .sort()
    .join('|');
}

export function createChabloPhaserBridge({
  Phaser,
  container,
  onInitialRender,
  onHotspotActivate,
  onSelectAvatar,
  onTileActivate
}) {
  const bridgeState = {
    game: null,
    scene: null
  };

  class ChabloStageScene extends Phaser.Scene {
    constructor() {
      super('chablo-stage');
      this.worldLayer = null;
      this.avatarLayer = null;
      this.avatarManager = null;
      this.renderedRoomId = null;
      this.renderedHotspotId = null;
      this.renderedRoomStateKey = '';
      this.selectedAvatar = null;
      this.currentBounds = null;
      this.pendingWorld = null;
      this.isTransitioning = false;
      this.hasRenderedInitialWorld = false;
    }

    create() {
      this.cameras.main.setBackgroundColor('#162130');
      this.cameras.main.setRoundPixels(false);
      this.worldLayer = this.add.container(0, 0);
      this.avatarLayer = this.add.container(0, 0);
      this.avatarManager = createAvatarManager({
        scene: this,
        Phaser,
        layer: this.avatarLayer,
        onSelectAvatar,
        tweenMs: STEP_TWEEN_MS,
        remoteTweenMs: 170
      });
    }

    renderWorld(world, forceRoomRedraw = false) {
      const room = getChabloRoom(world.roomId);
      this.selectedAvatar = world.selectedAvatar || null;
      const activeHotspotId = world.activeHotspotId || null;
      const roomStateKey = getRoomStateKey(world.roomStateByHotspotId);

      if (
        forceRoomRedraw
        ||
        this.renderedRoomId !== room.id
        || this.renderedHotspotId !== activeHotspotId
        || this.renderedRoomStateKey !== roomStateKey
      ) {
        this.currentBounds = drawChabloRoom(this, this.worldLayer, room, {
          activeHotspotId,
          roomStateByHotspotId: world.roomStateByHotspotId || {},
          onHotspotActivate,
          onTileActivate
        });
        this.cameras.main.setBounds(0, 0, this.currentBounds.width, this.currentBounds.height);
        this.renderedRoomId = room.id;
        this.renderedHotspotId = activeHotspotId;
        this.renderedRoomStateKey = roomStateKey;
      }

      const everyone = [
        { username: world.currentUser, ...world.position, isSelf: true },
        ...world.otherOccupants.map((occupant) => ({ ...occupant, isSelf: false }))
      ];

      this.avatarManager?.sync(everyone, this.selectedAvatar, getAvatarPosition, {
        forceImmediate: forceRoomRedraw
      });
      const localAvatar = this.avatarManager?.get?.(world.currentUser);
      if (localAvatar?.container) {
        this.cameras.main.startFollow(localAvatar.container, true, 0.14, 0.14);
      }

      if (!this.hasRenderedInitialWorld) {
        this.hasRenderedInitialWorld = true;
        onInitialRender?.();
      }
    }

    playRoomTransition(nextWorld) {
      this.pendingWorld = nextWorld;
      if (this.isTransitioning) {
        return;
      }

      this.isTransitioning = true;
      const camera = this.cameras.main;
      camera.stopFollow();
      camera.removeAllListeners('camerafadeoutcomplete');
      camera.removeAllListeners('camerafadeincomplete');
      camera.once('camerafadeoutcomplete', () => {
        const worldToRender = this.pendingWorld;
        this.pendingWorld = null;
        if (worldToRender) {
          this.renderWorld(worldToRender, true);
        }

        camera.once('camerafadeincomplete', () => {
          this.isTransitioning = false;
          if (this.pendingWorld) {
            const pendingRoomId = this.pendingWorld.roomId;
            if (pendingRoomId !== this.renderedRoomId) {
              this.playRoomTransition(this.pendingWorld);
            } else {
              const pendingWorld = this.pendingWorld;
              this.pendingWorld = null;
              this.renderWorld(pendingWorld);
            }
          }
        });

        camera.fadeIn(ROOM_TRANSITION_MS, 8, 16, 24);
      });
      camera.fadeOut(ROOM_TRANSITION_MS, 8, 16, 24);
    }

    updateWorld(world) {
      if (!world) {
        return;
      }

      if (this.renderedRoomId && this.renderedRoomId !== world.roomId) {
        this.playRoomTransition(world);
        return;
      }

      this.renderWorld(world);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    backgroundColor: '#162130',
    width: 640,
    height: 420,
    render: {
      antialias: true,
      pixelArt: false
    },
    scene: ChabloStageScene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 640,
      height: 420
    }
  });

  bridgeState.game = game;
  bridgeState.scene = game.scene.keys['chablo-stage'];

  const resize = (width, height) => {
    if (!bridgeState.game || !width || !height) {
      return;
    }
    bridgeState.game.scale.resize(width, height);
  };

  return {
    updateWorld(world) {
      const scene = bridgeState.scene || bridgeState.game?.scene?.keys?.['chablo-stage'];
      if (!scene) {
        return;
      }
      bridgeState.scene = scene;
      if (scene.sys?.isActive()) {
        scene.updateWorld(world);
        return;
      }
      window.setTimeout(() => {
        if (scene.sys?.isActive()) {
          scene.updateWorld(world);
        }
      }, 0);
    },
    resize,
    destroy() {
      bridgeState.scene?.cameras?.main?.removeAllListeners?.('camerafadeoutcomplete');
      bridgeState.scene?.cameras?.main?.removeAllListeners?.('camerafadeincomplete');
      bridgeState.scene?.avatarManager?.clear?.();
      bridgeState.game?.destroy(true);
      bridgeState.scene = null;
      bridgeState.game = null;
    }
  };
}

export default createChabloPhaserBridge;
