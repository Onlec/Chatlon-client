const LABEL_OFFSET_Y = 24;
export const DEFAULT_REMOTE_SNAP_DISTANCE_PX = 132;

function hashUsernameColor(username) {
  let hash = 0;
  for (let index = 0; index < username.length; index += 1) {
    hash = ((hash << 5) - hash) + username.charCodeAt(index);
    hash |= 0;
  }
  const hue = Math.abs(hash % 360);
  const saturation = 65;
  const lightness = 63;
  const chroma = (1 - Math.abs((2 * lightness / 100) - 1)) * (saturation / 100);
  const hueSection = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection < 1) {
    red = chroma;
    green = secondary;
  } else if (hueSection < 2) {
    red = secondary;
    green = chroma;
  } else if (hueSection < 3) {
    green = chroma;
    blue = secondary;
  } else if (hueSection < 4) {
    green = secondary;
    blue = chroma;
  } else if (hueSection < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = lightness / 100 - chroma / 2;
  const toChannel = (value) => Math.round((value + match) * 255);
  return (toChannel(red) << 16) + (toChannel(green) << 8) + toChannel(blue);
}

function getLabelWidth(username) {
  return Math.max(60, Math.min(118, (username.length * 7) + 18));
}

function getFacingFromPositions(fromPosition, toPosition, fallbackFacing = 'down') {
  if (!fromPosition || !toPosition) {
    return fallbackFacing;
  }

  const deltaX = toPosition.x - fromPosition.x;
  const deltaY = toPosition.y - fromPosition.y;
  if (deltaX === 0 && deltaY === 0) {
    return fallbackFacing;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? 'right' : 'left';
  }

  return deltaY > 0 ? 'down' : 'up';
}

function applyFacingStyles(avatar, facing, isSelf, isMoving) {
  const markerColor = isSelf ? 0x5c3900 : 0x11253c;
  const markerAlpha = isMoving ? 1 : 0.86;
  avatar.faceMarker.setFillStyle(markerColor, markerAlpha);

  switch (facing) {
    case 'left':
      avatar.faceMarker.setPosition(-9, -1);
      avatar.faceMarker.setSize(4, 11);
      break;
    case 'right':
      avatar.faceMarker.setPosition(9, -1);
      avatar.faceMarker.setSize(4, 11);
      break;
    case 'up':
      avatar.faceMarker.setPosition(0, -9);
      avatar.faceMarker.setSize(12, 4);
      break;
    default:
      avatar.faceMarker.setPosition(0, 7);
      avatar.faceMarker.setSize(12, 4);
      break;
  }
}

function applySelectionStyles(avatar, isSelected, isSelf) {
  if (isSelf) {
    avatar.body.setStrokeStyle(2, 0x5c3900, 0.9);
    avatar.labelBg.setFillStyle(0x0c141d, 0.82);
    return;
  }

  avatar.body.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xe3efff : 0x162338, 0.95);
  avatar.labelBg.setFillStyle(isSelected ? 0x204066 : 0x0c141d, isSelected ? 0.94 : 0.76);
}

function applyPresenceStyles(avatar, isSelf, isMoving) {
  const dotColor = isSelf ? 0xf0c97c : (isMoving ? 0x8cf5c6 : 0x8acaff);
  avatar.statusDot.setFillStyle(dotColor, isMoving ? 0.98 : 0.88);
  avatar.shadow.setAlpha(isMoving ? 0.28 : 0.18);
  avatar.body.setAlpha(isSelf ? 0.95 : (isMoving ? 0.96 : 0.92));
}

function createAvatarContainer(scene, Phaser, username, isSelf, onSelectAvatar) {
  const labelWidth = getLabelWidth(username);
  const bodyColor = isSelf ? 0xe2b35d : hashUsernameColor(username);
  const shadow = scene.add.rectangle(0, 12, 20, 7, 0x08111b, 0.18);
  const body = scene.add.rectangle(0, 0, 28, 28, bodyColor, isSelf ? 0.95 : 0.92);
  body.setStrokeStyle(isSelf ? 2 : 1, isSelf ? 0x5c3900 : 0x162338, 0.9);

  const faceMarker = scene.add.rectangle(0, 7, 12, 4, isSelf ? 0x5c3900 : 0x11253c, 0.86);
  const labelBg = scene.add.rectangle(0, LABEL_OFFSET_Y, labelWidth, 16, 0x0c141d, 0.76);
  const statusDot = scene.add.rectangle((labelWidth / 2) - 8, LABEL_OFFSET_Y, 7, 7, isSelf ? 0xf0c97c : 0x8acaff, 0.88);
  const label = scene.add.text(0, LABEL_OFFSET_Y, username, {
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '11px',
    color: '#eef5ff'
  }).setOrigin(0.5);

  const container = scene.add.container(0, 0, [shadow, body, faceMarker, labelBg, statusDot, label]);
  container.setSize(Math.max(62, labelWidth + 8), 48);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-(Math.max(62, labelWidth + 8) / 2), -16, Math.max(62, labelWidth + 8), 48),
    Phaser.Geom.Rectangle.Contains
  );

  if (!isSelf) {
    container.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      onSelectAvatar(username);
    });
    container.on('pointerover', () => {
      body.setScale(1.05);
      labelBg.setAlpha(0.88);
    });
    container.on('pointerout', () => {
      body.setScale(1);
      labelBg.setAlpha(0.76);
    });
  }

  return {
    container,
    body,
    shadow,
    faceMarker,
    labelBg,
    statusDot,
    activeTween: null,
    activeTweenTarget: null,
    initialized: false,
    isSelf,
    facing: 'down',
    lastPosition: null
  };
}

export function createAvatarManager({
  scene,
  Phaser,
  layer,
  onSelectAvatar,
  tweenMs = 140,
  remoteTweenMs = 190
}) {
  const avatarMap = new Map();

  return {
    sync(occupants, selectedUsername, getAvatarPosition, options = {}) {
      const forceImmediate = options.forceImmediate === true;
      const presenceEventsEnabled = options.presenceEventsEnabled === true;
      const remoteSnapDistancePx = Number(options.remoteSnapDistancePx) || DEFAULT_REMOTE_SNAP_DISTANCE_PX;
      const nextNames = new Set();
      const joined = [];
      const left = [];

      occupants.forEach((occupant) => {
        nextNames.add(occupant.username);
        let avatar = avatarMap.get(occupant.username);
        if (!avatar) {
          avatar = createAvatarContainer(scene, Phaser, occupant.username, occupant.isSelf, onSelectAvatar);
          avatarMap.set(occupant.username, avatar);
          layer.add(avatar.container);
          if (!occupant.isSelf && presenceEventsEnabled) {
            joined.push(occupant.username);
          }
        }

        const avatarPosition = getAvatarPosition(occupant);
        const positionChanged = (
          !avatar.lastPosition
          || avatar.lastPosition.x !== avatarPosition.x
          || avatar.lastPosition.y !== avatarPosition.y
        );
        const nextFacing = positionChanged
          ? getFacingFromPositions(avatar.lastPosition, avatarPosition, avatar.facing)
          : avatar.facing;
        const distance = avatar.lastPosition
          ? Math.hypot(avatarPosition.x - avatar.lastPosition.x, avatarPosition.y - avatar.lastPosition.y)
          : 0;
        const shouldSnap = forceImmediate || (!occupant.isSelf && distance >= remoteSnapDistancePx);
        const targetUnchanged = Boolean(
          avatar.activeTween
          && avatar.activeTweenTarget
          && avatar.activeTweenTarget.x === avatarPosition.x
          && avatar.activeTweenTarget.y === avatarPosition.y
        );

        if (shouldSnap) {
          avatar.activeTween?.stop?.();
          avatar.activeTween = null;
          avatar.activeTweenTarget = null;
          avatar.container.setPosition(avatarPosition.x, avatarPosition.y);
        } else if (positionChanged && avatar.initialized && !targetUnchanged) {
          avatar.activeTween?.stop?.();
          avatar.activeTweenTarget = avatarPosition;
          const tween = scene.tweens.add({
            targets: avatar.container,
            x: avatarPosition.x,
            y: avatarPosition.y,
            duration: occupant.isSelf ? tweenMs : remoteTweenMs,
            ease: occupant.isSelf ? 'Quad.Out' : 'Sine.Out',
            onComplete: () => {
              if (avatar.activeTween === tween) {
                avatar.activeTween = null;
                avatar.activeTweenTarget = null;
                applyFacingStyles(avatar, avatar.facing, occupant.isSelf, false);
                applyPresenceStyles(avatar, occupant.isSelf, false);
              }
            }
          });
          avatar.activeTween = tween;
        } else if (!avatar.activeTween) {
          avatar.container.setPosition(avatarPosition.x, avatarPosition.y);
        }

        avatar.initialized = true;
        avatar.lastPosition = avatarPosition;
        avatar.facing = nextFacing;

        const isMoving = Boolean(avatar.activeTween) || (positionChanged && !shouldSnap);
        applyFacingStyles(avatar, avatar.facing, occupant.isSelf, isMoving);
        applyPresenceStyles(avatar, occupant.isSelf, isMoving);
        applySelectionStyles(avatar, selectedUsername === occupant.username, occupant.isSelf);
      });

      Array.from(avatarMap.keys()).forEach((username) => {
        if (nextNames.has(username)) {
          return;
        }
        const avatar = avatarMap.get(username);
        if (!avatar?.isSelf && presenceEventsEnabled) {
          left.push(username);
        }
        avatar?.activeTween?.stop?.();
        avatar?.container?.destroy();
        avatarMap.delete(username);
      });

      return { joined, left };
    },
    clear() {
      avatarMap.forEach((avatar) => {
        avatar.activeTween?.stop?.();
        avatar.container?.destroy();
      });
      avatarMap.clear();
    },
    get(username) {
      return avatarMap.get(username) || null;
    }
  };
}

export default createAvatarManager;
