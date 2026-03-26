const LABEL_OFFSET_Y = 22;

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

function createAvatarContainer(scene, Phaser, username, isSelf, onSelectAvatar) {
  const bodyColor = isSelf ? 0xe2b35d : hashUsernameColor(username);
  const body = scene.add.rectangle(0, 0, 28, 28, bodyColor, isSelf ? 0.95 : 0.92);
  body.setStrokeStyle(isSelf ? 2 : 1, isSelf ? 0x5c3900 : 0x162338, 0.9);

  const labelBg = scene.add.rectangle(0, LABEL_OFFSET_Y, 58, 16, 0x0c141d, 0.72);
  const label = scene.add.text(0, LABEL_OFFSET_Y, username, {
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '11px',
    color: '#eef5ff'
  }).setOrigin(0.5);

  const container = scene.add.container(0, 0, [body, labelBg, label]);
  container.setSize(62, 44);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-31, -14, 62, 44),
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
      labelBg.setAlpha(0.72);
    });
  }

  return {
    container,
    body,
    labelBg,
    activeTween: null,
    initialized: false
  };
}

function applySelectionStyles(avatar, isSelected, isSelf) {
  if (isSelf) {
    avatar.body.setStrokeStyle(2, 0x5c3900, 0.9);
    avatar.labelBg.setFillStyle(0x0c141d, 0.78);
    return;
  }

  avatar.body.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xe3efff : 0x162338, 0.95);
  avatar.labelBg.setFillStyle(isSelected ? 0x204066 : 0x0c141d, isSelected ? 0.92 : 0.72);
}

export function createAvatarManager({
  scene,
  Phaser,
  layer,
  onSelectAvatar,
  tweenMs = 140,
  remoteTweenMs = 170
}) {
  const avatarMap = new Map();

  return {
    sync(occupants, selectedUsername, getAvatarPosition, options = {}) {
      const forceImmediate = options.forceImmediate === true;
      const nextNames = new Set();

      occupants.forEach((occupant) => {
        nextNames.add(occupant.username);
        let avatar = avatarMap.get(occupant.username);
        if (!avatar) {
          avatar = createAvatarContainer(scene, Phaser, occupant.username, occupant.isSelf, onSelectAvatar);
          avatarMap.set(occupant.username, avatar);
          layer.add(avatar.container);
        }

        const avatarPosition = getAvatarPosition(occupant);
        const positionChanged = (
          !avatar.lastPosition
          || avatar.lastPosition.x !== avatarPosition.x
          || avatar.lastPosition.y !== avatarPosition.y
        );
        const shouldTween = !forceImmediate && avatar.initialized && positionChanged;
        if (shouldTween) {
          avatar.activeTween?.stop?.();
          const tween = scene.tweens.add({
            targets: avatar.container,
            x: avatarPosition.x,
            y: avatarPosition.y,
            duration: occupant.isSelf ? tweenMs : remoteTweenMs,
            ease: occupant.isSelf ? 'Quad.Out' : 'Sine.Out',
            onComplete: () => {
              if (avatar.activeTween === tween) {
                avatar.activeTween = null;
              }
            }
          });
          avatar.activeTween = tween;
        } else {
          if (forceImmediate) {
            avatar.activeTween?.stop?.();
            avatar.activeTween = null;
          }
          if (!avatar.activeTween) {
            avatar.container.setPosition(avatarPosition.x, avatarPosition.y);
          }
        }
        avatar.initialized = true;
        avatar.lastPosition = avatarPosition;
        applySelectionStyles(avatar, selectedUsername === occupant.username, occupant.isSelf);
      });

      Array.from(avatarMap.keys()).forEach((username) => {
        if (nextNames.has(username)) {
          return;
        }
        avatarMap.get(username)?.activeTween?.stop?.();
        avatarMap.get(username)?.container?.destroy();
        avatarMap.delete(username);
      });
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
