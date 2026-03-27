import { createAvatarManager } from './avatars';
import { drawChabloRoom, STAGE_PADDING, TILE_SIZE } from './graphics';
import { findRoomPath } from './movement';
import { getChabloRoom } from './rooms';
import { STEP_TWEEN_MS } from './useChabloMovementController';

const ROOM_TRANSITION_MS = 220;
const REMOTE_SNAP_DISTANCE_PX = TILE_SIZE * 2.75;
const PRESENCE_NOTICE_TTL_MS = 1650;
const PREVIEW_TILE_ALPHA = 0.18;
const PREVIEW_PATH_COLOR = 0xbde2ff;
const PREVIEW_TARGET_COLOR = 0xf7fbff;
const DEFAULT_CAMERA_ZOOM = 1;
const MIN_CAMERA_ZOOM = 0.72;
const MAX_CAMERA_ZOOM = 2.4;
const CAMERA_ZOOM_STEP = 0.14;

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

function getPreviewTilePosition(tile) {
  return {
    x: STAGE_PADDING + (tile.x * TILE_SIZE) + TILE_SIZE / 2,
    y: STAGE_PADDING + (tile.y * TILE_SIZE) + TILE_SIZE / 2
  };
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
      this.previewLayer = null;
      this.avatarManager = null;
      this.renderedRoomId = null;
      this.renderedHotspotId = null;
      this.renderedRoomStateKey = '';
      this.selectedAvatar = null;
      this.currentBounds = null;
      this.currentWorld = null;
      this.pendingWorld = null;
      this.isTransitioning = false;
      this.hasRenderedInitialWorld = false;
      this.noticeEntries = [];
      this.interactionPreview = null;
      this.currentZoom = DEFAULT_CAMERA_ZOOM;
    }

    create() {
      this.cameras.main.setBackgroundColor('#162130');
      this.cameras.main.setRoundPixels(false);
      this.cameras.main.setZoom(this.currentZoom);
      this.worldLayer = this.add.container(0, 0);
      this.avatarLayer = this.add.container(0, 0);
      this.previewLayer = this.add.container(0, 0);
      this.avatarManager = createAvatarManager({
        scene: this,
        Phaser,
        layer: this.avatarLayer,
        onSelectAvatar,
        tweenMs: STEP_TWEEN_MS,
        remoteTweenMs: 190
      });
    }

    clearInteractionPreview(source = null) {
      if (source && this.interactionPreview?.source !== source) {
        return;
      }
      this.interactionPreview = null;
      this.previewLayer?.removeAll(true);
    }

    setInteractionPreview(preview) {
      if (!preview?.target || !preview?.roomId) {
        this.clearInteractionPreview();
        return;
      }
      this.interactionPreview = preview;
      this.renderInteractionPreview();
    }

    renderInteractionPreview() {
      this.previewLayer?.removeAll(true);

      if (
        !this.previewLayer
        || !this.interactionPreview
        || !this.currentWorld
        || this.isTransitioning
        || this.interactionPreview.roomId !== this.currentWorld.roomId
      ) {
        return;
      }

      const { roomId, target, label, accent } = this.interactionPreview;
      const currentPosition = this.currentWorld.position;
      const sameTile = currentPosition?.x === target.x && currentPosition?.y === target.y;
      const path = sameTile ? [] : findRoomPath(roomId, currentPosition, target);

      if (!sameTile && !path.length) {
        return;
      }

      const previewColor = Number.isFinite(accent) ? accent : PREVIEW_PATH_COLOR;
      const tilesToRender = path.length ? path : [target];

      tilesToRender.forEach((tile, index) => {
        const tilePosition = getPreviewTilePosition(tile);
        const pathTile = this.add.rectangle(
          tilePosition.x,
          tilePosition.y,
          TILE_SIZE - 26,
          TILE_SIZE - 26,
          previewColor,
          index === tilesToRender.length - 1 ? 0.22 : PREVIEW_TILE_ALPHA
        );
        pathTile.setStrokeStyle(1, PREVIEW_TARGET_COLOR, index === tilesToRender.length - 1 ? 0.5 : 0.24);
        this.previewLayer.add(pathTile);
      });

      const targetPosition = getPreviewTilePosition(target);
      const targetPulse = this.add.rectangle(
        targetPosition.x,
        targetPosition.y,
        TILE_SIZE - 14,
        TILE_SIZE - 14,
        previewColor,
        0.1
      );
      targetPulse.setStrokeStyle(2, PREVIEW_TARGET_COLOR, 0.45);
      this.previewLayer.add(targetPulse);

      this.tweens.add({
        targets: targetPulse,
        alpha: { from: 0.08, to: 0.22 },
        scaleX: { from: 0.94, to: 1.06 },
        scaleY: { from: 0.94, to: 1.06 },
        duration: 560,
        yoyo: true,
        repeat: -1
      });

      if (typeof label === 'string' && label) {
        const previewLabel = this.add.text(
          targetPosition.x,
          targetPosition.y - (TILE_SIZE / 2) - 14,
          label,
          {
            fontFamily: 'Tahoma, Arial, sans-serif',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#f3f8ff',
            backgroundColor: 'rgba(10, 16, 26, 0.74)',
            padding: { left: 6, right: 6, top: 3, bottom: 3 }
          }
        ).setOrigin(0.5);
        this.previewLayer.add(previewLabel);
      }
    }

    clearPresenceNotices() {
      this.noticeEntries.forEach((entry) => entry.container?.destroy?.());
      this.noticeEntries = [];
    }

    layoutPresenceNotices() {
      this.noticeEntries.forEach((entry, index) => {
        const nextY = 28 + (index * 28);
        entry.container.setPosition(18, nextY);
      });
    }

    emitPresenceNotice(message, accent = 0x8acaff) {
      const container = this.add.container(18, 28 + (this.noticeEntries.length * 28));
      container.setScrollFactor?.(0);
      container.setAlpha(0);

      const plate = this.add.rectangle(0, 0, 220, 24, 0x08111b, 0.84).setOrigin(0, 0.5);
      plate.setStrokeStyle(1, accent, 0.28);
      const dot = this.add.rectangle(12, 0, 7, 7, accent, 0.96).setOrigin(0.5);
      const label = this.add.text(24, 0, message, {
        fontFamily: 'Tahoma, Arial, sans-serif',
        fontSize: '11px',
        color: '#eef5ff'
      }).setOrigin(0, 0.5);
      container.add([plate, dot, label]);

      this.noticeEntries.push({ container });
      this.layoutPresenceNotices();

      this.tweens.add({
        targets: container,
        alpha: { from: 0, to: 1 },
        x: { from: 8, to: 18 },
        duration: 140,
        onComplete: () => {
          this.tweens.add({
            targets: container,
            delay: PRESENCE_NOTICE_TTL_MS,
            alpha: { from: 1, to: 0 },
            y: { from: container.y, to: container.y - 8 },
            duration: 220,
            onComplete: () => {
              container.destroy();
              this.noticeEntries = this.noticeEntries.filter((entry) => entry.container !== container);
              this.layoutPresenceNotices();
            }
          });
        }
      });
    }

    emitPresenceEvents(syncResult) {
      const mutedUsernames = new Set(this.currentWorld?.mutedUsernames || []);
      syncResult.joined.forEach((username) => {
        if (!mutedUsernames.has(username)) {
          this.emitPresenceNotice(`${username} komt binnen`, 0x8cf5c6);
        }
      });
      syncResult.left.forEach((username) => {
        if (!mutedUsernames.has(username)) {
          this.emitPresenceNotice(`${username} glipt weer weg`, 0xf0c97c);
        }
      });
    }

    setCameraZoom(nextZoom) {
      const normalizedZoom = Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, nextZoom));
      this.currentZoom = normalizedZoom;
      this.cameras.main.setZoom(normalizedZoom);
      return normalizedZoom;
    }

    adjustCameraZoom(direction) {
      if (!Number.isFinite(direction) || direction === 0) {
        return this.currentZoom;
      }

      const zoomDelta = direction > 0 ? CAMERA_ZOOM_STEP : -CAMERA_ZOOM_STEP;
      return this.setCameraZoom(this.currentZoom + zoomDelta);
    }

    renderWorld(world, forceRoomRedraw = false) {
      this.currentWorld = world;
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
        if (forceRoomRedraw) {
          this.clearPresenceNotices();
        }
      }

      const everyone = [
        { username: world.currentUser, ...world.position, isSelf: true },
        ...world.otherOccupants.map((occupant) => ({ ...occupant, isSelf: false }))
      ];

      const syncResult = this.avatarManager?.sync(everyone, this.selectedAvatar, getAvatarPosition, {
        activeEmotesByUsername: world.activeEmotesByUsername || {},
        activeSpeechByUsername: world.activeSpeechByUsername || {},
        appearanceByUsername: world.appearanceByUsername || {},
        forceImmediate: forceRoomRedraw,
        presenceEventsEnabled: this.hasRenderedInitialWorld && !forceRoomRedraw,
        remoteSnapDistancePx: REMOTE_SNAP_DISTANCE_PX
      }) || { joined: [], left: [] };
      const localAvatar = this.avatarManager?.get?.(world.currentUser);
      if (localAvatar?.container) {
        this.cameras.main.startFollow(localAvatar.container, true, 0.14, 0.14);
      }

      this.emitPresenceEvents(syncResult);
      this.renderInteractionPreview();

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
      this.clearInteractionPreview();
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
    adjustZoom(deltaY) {
      const scene = bridgeState.scene || bridgeState.game?.scene?.keys?.['chablo-stage'];
      if (!scene || !scene.sys?.isActive() || !Number.isFinite(deltaY) || deltaY === 0) {
        return DEFAULT_CAMERA_ZOOM;
      }

      bridgeState.scene = scene;
      const direction = deltaY < 0 ? 1 : -1;
      return scene.adjustCameraZoom(direction);
    },
    destroy() {
      bridgeState.scene?.clearInteractionPreview?.();
      bridgeState.scene?.clearPresenceNotices?.();
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
