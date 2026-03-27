import {
  CHABLO_BODY_SHAPE_TEMPLATES,
  getChabloAvatarAppearanceSignature,
  getChabloAvatarColor,
  normalizeChabloAvatarAppearance
} from './chabloAvatarAppearance';

export const DEFAULT_REMOTE_SNAP_DISTANCE_PX = 132;

function getLabelWidth(username) {
  return Math.max(60, Math.min(118, (username.length * 7) + 18));
}

function getEmoteWidth(label) {
  return Math.max(42, Math.min(82, (String(label || '').length * 8) + 18));
}

function getSpeechWidth(text) {
  return Math.max(84, Math.min(208, (String(text || '').length * 7) + 24));
}

function toColorValue(value, fallback = 0x8fd4ff) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace('#', '');
    const parsed = Number.parseInt(normalized, 16);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function shadeColor(hexColor, factor = 0.12) {
  const color = toColorValue(hexColor, 0xffffff);
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  const adjust = (channel) => Math.max(0, Math.min(255, Math.round(channel * (1 - factor))));
  return (adjust(red) << 16) + (adjust(green) << 8) + adjust(blue);
}

function createRegularPolygonPoints(sides, width, height, rotationOffset = -Math.PI / 2) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;

  return Array.from({ length: sides }, (_, index) => {
    const angle = rotationOffset + ((Math.PI * 2 * index) / sides);
    return {
      x: centerX + (Math.cos(angle) * radiusX),
      y: centerY + (Math.sin(angle) * radiusY)
    };
  });
}

function createPrimitive(scene, primitive, x, y, width, height, color, alpha = 1) {
  const fillColor = toColorValue(color, 0xffffff);

  if (primitive === 'ellipse') {
    return scene.add.ellipse(x, y, width, height, fillColor, alpha);
  }

  if (primitive === 'triangle') {
    return scene.add.triangle(
      x,
      y,
      0,
      height,
      width / 2,
      0,
      width,
      height,
      fillColor,
      alpha
    );
  }

  if (primitive === 'triangle-inverted') {
    return scene.add.triangle(
      x,
      y,
      0,
      0,
      width / 2,
      height,
      width,
      0,
      fillColor,
      alpha
    );
  }

  if (primitive === 'pentagon') {
    return scene.add.polygon(
      x,
      y,
      createRegularPolygonPoints(5, width, height),
      fillColor,
      alpha
    );
  }

  if (primitive === 'hexagon') {
    return scene.add.polygon(
      x,
      y,
      createRegularPolygonPoints(6, width, height),
      fillColor,
      alpha
    );
  }

  return scene.add.rectangle(x, y, width, height, fillColor, alpha);
}

function createPair(scene, primitive, width, height, y, gap, color, alpha = 1) {
  const left = createPrimitive(scene, primitive, -gap, y, width, height, color, alpha);
  const right = createPrimitive(scene, primitive, gap, y, width, height, color, alpha);
  return [left, right];
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

function createHairNodes(scene, appearance, template) {
  const color = getChabloAvatarColor('hairColor', appearance.hairColor);
  const darker = shadeColor(color, 0.22);
  const hairY = template.hairY;

  switch (appearance.hairStyle) {
    case 'bob':
      return [
        createPrimitive(scene, 'ellipse', 0, hairY, template.width - 2, 11, color, 0.98),
        createPrimitive(scene, 'rect', -7, hairY + 3, 4, 10, darker, 0.9),
        createPrimitive(scene, 'rect', 7, hairY + 3, 4, 10, darker, 0.9)
      ];
    case 'parted':
      return [
        createPrimitive(scene, 'ellipse', 0, hairY, template.width - 2, 10, color, 0.98),
        createPrimitive(scene, 'rect', 0, hairY - 1, 2, 9, 0xf5f0d8, 0.7)
      ];
    case 'mohawk':
      return [
        createPrimitive(scene, 'triangle', 0, hairY, 10, 14, color, 0.98),
        createPrimitive(scene, 'rect', 0, hairY + 3, 3, 9, darker, 0.9)
      ];
    case 'puff':
      return [
        createPrimitive(scene, 'ellipse', 0, hairY - 1, template.width - 8, 14, color, 0.98),
        createPrimitive(scene, 'ellipse', 0, hairY - 6, template.width - 14, 9, darker, 0.84)
      ];
    case 'slick':
      return [
        createPrimitive(scene, 'ellipse', 0, hairY + 1, template.width - 3, 8, color, 0.98),
        createPrimitive(scene, 'triangle', 6, hairY - 2, 8, 8, darker, 0.9)
      ];
    case 'crop':
    default:
      return [
        createPrimitive(scene, 'ellipse', 0, hairY, template.width - 6, 9, color, 0.98)
      ];
  }
}

function createAccentNodes(scene, appearance, template) {
  if (appearance.accentStyle === 'none') {
    return [];
  }

  const color = getChabloAvatarColor('accentColor', appearance.accentColor);
  const accentY = template.accentY;

  switch (appearance.accentStyle) {
    case 'badge':
      return [
        createPrimitive(scene, 'ellipse', 7, accentY, 6, 6, color, 0.96)
      ];
    case 'scarf':
      return [
        createPrimitive(scene, 'rect', 0, accentY + 1, template.width - 10, 4, color, 0.94),
        createPrimitive(scene, 'rect', 4, accentY + 6, 4, 8, color, 0.9)
      ];
    case 'glasses':
      return [
        ...createPair(scene, 'ellipse', 7, 6, accentY - 2, 5, color, 0.96),
        createPrimitive(scene, 'rect', 0, accentY - 2, 5, 2, color, 0.96)
      ];
    case 'satchel':
      return [
        createPrimitive(scene, 'rect', 0, accentY + 4, 3, 16, color, 0.9),
        createPrimitive(scene, 'rect', 6, accentY + 7, 8, 8, color, 0.94)
      ];
    default:
      return [];
  }
}

function rebuildAvatarAppearance(scene, avatar, appearance) {
  const normalized = normalizeChabloAvatarAppearance(appearance, avatar.username);
  const signature = getChabloAvatarAppearanceSignature(normalized);
  if (avatar.appearanceSignature === signature) {
    return normalized;
  }

  const template = CHABLO_BODY_SHAPE_TEMPLATES[normalized.bodyShape] || CHABLO_BODY_SHAPE_TEMPLATES.square;
  const visualOffsetY = Number(template.visualOffsetY) || 0;
  avatar.visualLayer.removeAll?.(true);
  avatar.visualLayer.setPosition?.(0, visualOffsetY);

  const skinColor = getChabloAvatarColor('skinTone', normalized.skinTone);
  const body = createPrimitive(scene, template.primitive, 0, 0, template.width, template.height, skinColor, avatar.isSelf ? 0.95 : 0.92);
  avatar.visualLayer.add(body);

  [
    ...createHairNodes(scene, normalized, template),
    ...createAccentNodes(scene, normalized, template)
  ].forEach((node) => avatar.visualLayer.add(node));

  avatar.body = body;
  avatar.template = template;
  avatar.appearanceSignature = signature;
  avatar.speechRestY = (template.labelOffsetY || 24) - 48;
  avatar.emoteRestY = avatar.speechRestY - 22;

  avatar.labelBg.setPosition(0, template.labelOffsetY);
  avatar.label.setPosition(0, template.labelOffsetY);
  avatar.statusDot.setPosition((getLabelWidth(avatar.username) / 2) - 8, template.labelOffsetY);
  avatar.speechContainer.setPosition(0, avatar.speechRestY);
  avatar.emoteContainer.setPosition(0, avatar.emoteRestY);

  return normalized;
}

function applyFacingStyles(avatar, facing, isSelf, isMoving) {
  const markerColor = isSelf ? 0x5c3900 : 0x11253c;
  const markerAlpha = isMoving ? 1 : 0.86;
  const face = avatar.template?.face?.[facing] || avatar.template?.face?.down || { x: 0, y: 7, width: 12, height: 4 };
  const visualOffsetY = Number(avatar.template?.visualOffsetY) || 0;
  avatar.faceMarker.setFillStyle(markerColor, markerAlpha);
  avatar.faceMarker.setPosition(face.x, face.y + visualOffsetY);
  avatar.faceMarker.setSize(face.width, face.height);
}

function applySelectionStyles(avatar, isSelected, isSelf) {
  if (isSelf) {
    avatar.body?.setStrokeStyle?.(2, 0x5c3900, 0.9);
    avatar.labelBg.setFillStyle(0x0c141d, 0.82);
    return;
  }

  avatar.body?.setStrokeStyle?.(isSelected ? 2 : 1, isSelected ? 0xe3efff : 0x162338, 0.95);
  avatar.labelBg.setFillStyle(isSelected ? 0x204066 : 0x0c141d, isSelected ? 0.94 : 0.76);
}

function applyPresenceStyles(avatar, isSelf, isMoving) {
  const dotColor = isSelf ? 0xf0c97c : (isMoving ? 0x8cf5c6 : 0x8acaff);
  avatar.statusDot.setFillStyle(dotColor, isMoving ? 0.98 : 0.88);
  avatar.shadow.setAlpha(isMoving ? 0.28 : 0.18);
  avatar.body?.setAlpha?.(isSelf ? 0.95 : (isMoving ? 0.96 : 0.92));
}

function stopEmoteTween(avatar) {
  avatar.activeEmoteTween?.stop?.();
  avatar.activeEmoteTween = null;
}

function stopSpeechTween(avatar) {
  avatar.activeSpeechTween?.stop?.();
  avatar.activeSpeechTween = null;
}

function hideEmoteBubble(avatar, preserveSignature = false) {
  stopEmoteTween(avatar);
  avatar.emoteContainer.setAlpha(0);
  avatar.emoteContainer.setPosition(0, avatar.emoteRestY);
  avatar.emoteLabel.setText('');
  avatar.emoteBubbleBg.setSize(42, 18);

  if (!preserveSignature) {
    avatar.activeEmoteSignature = null;
    avatar.activeEmoteExpiresAt = 0;
  }
}

function hideSpeechBubble(avatar, preserveSignature = false) {
  stopSpeechTween(avatar);
  avatar.speechContainer.setAlpha(0);
  avatar.speechContainer.setPosition(0, avatar.speechRestY);
  avatar.speechLabel.setText('');
  avatar.speechBubbleBg.setSize(84, 22);

  if (!preserveSignature) {
    avatar.activeSpeechSignature = null;
    avatar.activeSpeechExpiresAt = 0;
  }
}

function showEmoteBubble(scene, avatar, emote) {
  if (!emote) {
    hideEmoteBubble(avatar);
    return;
  }

  const signature = `${emote.type}:${emote.by}:${emote.issuedAt}:${emote.targetUsername || ''}`;
  if (
    avatar.activeEmoteSignature === signature
    && avatar.activeEmoteExpiresAt === emote.expiresAt
  ) {
    return;
  }

  stopEmoteTween(avatar);
  avatar.activeEmoteSignature = signature;
  avatar.activeEmoteExpiresAt = emote.expiresAt;
  avatar.emoteLabel.setText(emote.label);
  avatar.emoteBubbleBg.setSize(getEmoteWidth(emote.label), 18);
  avatar.emoteBubbleBg.setStrokeStyle(1, toColorValue(emote.color), 0.56);
  avatar.emoteContainer.setAlpha(0);
  avatar.emoteContainer.setPosition(0, avatar.emoteRestY + 6);

  const remainingMs = Math.max(0, (Number(emote.expiresAt) || 0) - Date.now());
  if (remainingMs <= 0) {
    hideEmoteBubble(avatar);
    return;
  }

  const introDuration = Math.min(140, Math.max(90, Math.round(remainingMs * 0.28)));
  const outroDuration = Math.min(240, Math.max(120, Math.round(remainingMs * 0.42)));
  const holdDelay = Math.max(0, remainingMs - introDuration - outroDuration);

  const introTween = scene.tweens.add({
    targets: avatar.emoteContainer,
    alpha: { from: 0, to: 1 },
    y: { from: avatar.emoteRestY + 6, to: avatar.emoteRestY },
    duration: introDuration,
    ease: 'Sine.Out',
    onComplete: () => {
      if (avatar.activeEmoteSignature !== signature) {
        return;
      }

      avatar.activeEmoteTween = scene.tweens.add({
        targets: avatar.emoteContainer,
        delay: holdDelay,
        alpha: { from: 1, to: 0 },
        y: { from: avatar.emoteRestY, to: avatar.emoteRestY - 10 },
        duration: outroDuration,
        ease: 'Sine.In',
        onComplete: () => {
          if (avatar.activeEmoteSignature === signature) {
            hideEmoteBubble(avatar);
          }
        }
      });
    }
  });

  avatar.activeEmoteTween = introTween;
}

function showSpeechBubble(scene, avatar, speech) {
  if (!speech) {
    hideSpeechBubble(avatar);
    return;
  }

  const safeText = String(speech.text || '').trim().slice(0, 60);
  if (!safeText) {
    hideSpeechBubble(avatar);
    return;
  }

  const signature = `${speech.by}:${speech.issuedAt}:${safeText}`;
  if (
    avatar.activeSpeechSignature === signature
    && avatar.activeSpeechExpiresAt === speech.expiresAt
  ) {
    return;
  }

  stopSpeechTween(avatar);
  avatar.activeSpeechSignature = signature;
  avatar.activeSpeechExpiresAt = speech.expiresAt;
  avatar.speechLabel.setText(safeText);
  avatar.speechBubbleBg.setSize(getSpeechWidth(safeText), 22);
  avatar.speechContainer.setAlpha(0);
  avatar.speechContainer.setPosition(0, avatar.speechRestY + 6);

  const remainingMs = Math.max(0, (Number(speech.expiresAt) || 0) - Date.now());
  if (remainingMs <= 0) {
    hideSpeechBubble(avatar);
    return;
  }

  const introDuration = Math.min(170, Math.max(110, Math.round(remainingMs * 0.22)));
  const outroDuration = Math.min(320, Math.max(150, Math.round(remainingMs * 0.36)));
  const holdDelay = Math.max(0, remainingMs - introDuration - outroDuration);

  const introTween = scene.tweens.add({
    targets: avatar.speechContainer,
    alpha: { from: 0, to: 1 },
    y: { from: avatar.speechRestY + 6, to: avatar.speechRestY },
    duration: introDuration,
    ease: 'Sine.Out',
    onComplete: () => {
      if (avatar.activeSpeechSignature !== signature) {
        return;
      }

      avatar.activeSpeechTween = scene.tweens.add({
        targets: avatar.speechContainer,
        delay: holdDelay,
        alpha: { from: 1, to: 0 },
        y: { from: avatar.speechRestY, to: avatar.speechRestY - 8 },
        duration: outroDuration,
        ease: 'Sine.In',
        onComplete: () => {
          if (avatar.activeSpeechSignature === signature) {
            hideSpeechBubble(avatar);
          }
        }
      });
    }
  });

  avatar.activeSpeechTween = introTween;
}

function createAvatarContainer(scene, Phaser, username, isSelf, onSelectAvatar) {
  const labelWidth = getLabelWidth(username);
  const shadow = scene.add.rectangle(0, 12, 20, 7, 0x08111b, 0.18);
  const visualLayer = scene.add.container(0, 0);
  const faceMarker = scene.add.rectangle(0, 7, 12, 4, isSelf ? 0x5c3900 : 0x11253c, 0.86);
  const labelBg = scene.add.rectangle(0, 24, labelWidth, 16, 0x0c141d, 0.76);
  const statusDot = scene.add.rectangle((labelWidth / 2) - 8, 24, 7, 7, isSelf ? 0xf0c97c : 0x8acaff, 0.88);
  const label = scene.add.text(0, 24, username, {
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '11px',
    color: '#eef5ff'
  }).setOrigin(0.5);
  const emoteBubbleBg = scene.add.rectangle(0, 0, 42, 18, 0x08111b, 0.9);
  emoteBubbleBg.setStrokeStyle(1, 0x8fd4ff, 0.56);
  const emoteLabel = scene.add.text(0, 0, '', {
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '10px',
    fontStyle: 'bold',
    color: '#f7fbff'
  }).setOrigin(0.5);
  const speechBubbleBg = scene.add.rectangle(0, 0, 84, 22, 0xf7fbff, 0.96);
  speechBubbleBg.setStrokeStyle(1, 0x0c141d, 0.3);
  const speechLabel = scene.add.text(0, 0, '', {
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '10px',
    fontStyle: 'bold',
    color: '#182433'
  }).setOrigin(0.5);
  const speechContainer = scene.add.container(0, -18, [speechBubbleBg, speechLabel]);
  speechContainer.setAlpha(0);
  const emoteContainer = scene.add.container(0, 2, [emoteBubbleBg, emoteLabel]);
  emoteContainer.setAlpha(0);

  const container = scene.add.container(0, 0, [shadow, visualLayer, faceMarker, speechContainer, labelBg, statusDot, label, emoteContainer]);
  container.setSize(Math.max(62, labelWidth + 8), 52);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-(Math.max(62, labelWidth + 8) / 2), -18, Math.max(62, labelWidth + 8), 52),
    Phaser.Geom.Rectangle.Contains
  );

  if (!isSelf) {
    container.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      onSelectAvatar(username);
    });
    container.on('pointerover', () => {
      visualLayer.setScale(1.05);
      labelBg.setAlpha(0.88);
    });
    container.on('pointerout', () => {
      visualLayer.setScale(1);
      labelBg.setAlpha(0.76);
    });
  }

  const avatar = {
    username,
    container,
    visualLayer,
    body: null,
    shadow,
    faceMarker,
    labelBg,
    statusDot,
    label,
    speechContainer,
    speechBubbleBg,
    speechLabel,
    emoteContainer,
    emoteBubbleBg,
    emoteLabel,
    activeTween: null,
    activeTweenTarget: null,
    activeSpeechTween: null,
    activeSpeechSignature: null,
    activeSpeechExpiresAt: 0,
    activeEmoteTween: null,
    activeEmoteSignature: null,
    activeEmoteExpiresAt: 0,
    appearanceSignature: null,
    template: CHABLO_BODY_SHAPE_TEMPLATES.square,
    speechRestY: -18,
    emoteRestY: 2,
    initialized: false,
    isSelf,
    facing: 'down',
    lastPosition: null
  };

  rebuildAvatarAppearance(scene, avatar, normalizeChabloAvatarAppearance(null, username));
  return avatar;
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
      const activeEmotesByUsername = options.activeEmotesByUsername || {};
      const activeSpeechByUsername = options.activeSpeechByUsername || {};
      const appearanceByUsername = options.appearanceByUsername || {};
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

        rebuildAvatarAppearance(scene, avatar, appearanceByUsername[occupant.username]);

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
        showSpeechBubble(scene, avatar, activeSpeechByUsername[occupant.username] || null);
        showEmoteBubble(scene, avatar, activeEmotesByUsername[occupant.username] || null);
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
        avatar?.activeSpeechTween?.stop?.();
        avatar?.activeEmoteTween?.stop?.();
        avatar?.container?.destroy();
        avatarMap.delete(username);
      });

      return { joined, left };
    },
    clear() {
      avatarMap.forEach((avatar) => {
        avatar.activeTween?.stop?.();
        avatar.activeSpeechTween?.stop?.();
        avatar.activeEmoteTween?.stop?.();
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
