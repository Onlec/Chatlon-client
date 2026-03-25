export const TILE_SIZE = 48;
export const STAGE_PADDING = 20;
const BLOCKED_TILE_CODES = new Set(['#', 'T', 'B', 'C']);

function toStageUnit(value) {
  return STAGE_PADDING + (value * TILE_SIZE);
}

function toTileCenter(value) {
  return toStageUnit(value) + TILE_SIZE / 2;
}

function parseColor(color, fallback) {
  if (typeof color !== 'string') {
    return fallback;
  }
  const parsed = Number.parseInt(color.replace('#', ''), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getTileFill(room, tileCode) {
  const accent = parseColor(room.accent, 0x607894);
  if (tileCode === '#') return 0x233249;
  if (tileCode === 'T') return 0x7a4f3a;
  if (tileCode === 'B') return 0xa85544;
  if (tileCode === 'C') return 0x67768f;
  if (tileCode === 'P') return 0x405267;
  return accent;
}

function getTileAlpha(tileCode) {
  if (tileCode === '.') return 0.12;
  if (tileCode === 'P') return 0.22;
  if (tileCode === '#') return 0.65;
  return 0.36;
}

function addRug(scene, layer, item) {
  const rug = scene.add.rectangle(
    toStageUnit(item.x) + (item.width || 1) * TILE_SIZE / 2,
    toStageUnit(item.y) + (item.height || 1) * TILE_SIZE / 2,
    (item.width || 1) * TILE_SIZE - 10,
    (item.height || 1) * TILE_SIZE - 10,
    parseColor(item.color, 0x304055),
    item.alpha ?? 0.34
  );
  rug.setStrokeStyle(2, parseColor(item.borderColor, 0xf2f7ff), 0.16);
  layer.add(rug);
}

function addCounter(scene, layer, item) {
  const counter = scene.add.rectangle(
    toStageUnit(item.x) + (item.width || 1) * TILE_SIZE / 2,
    toStageUnit(item.y) + (item.height || 1) * TILE_SIZE / 2,
    (item.width || 1) * TILE_SIZE - 8,
    (item.height || 1) * TILE_SIZE - 12,
    parseColor(item.color, 0x5a3d2f),
    0.9
  );
  counter.setStrokeStyle(2, parseColor(item.edgeColor, 0x1a1f27), 0.35);

  const counterTop = scene.add.rectangle(
    counter.x,
    counter.y - counter.height / 2 + 8,
    counter.width - 8,
    6,
    parseColor(item.topColor, 0xd0a57f),
    0.8
  );

  layer.add(counter);
  layer.add(counterTop);
}

function addSofa(scene, layer, item) {
  const body = scene.add.rectangle(
    toStageUnit(item.x) + (item.width || 1) * TILE_SIZE / 2,
    toStageUnit(item.y) + (item.height || 1) * TILE_SIZE / 2,
    (item.width || 1) * TILE_SIZE - 12,
    (item.height || 1) * TILE_SIZE - 12,
    parseColor(item.color, 0x6b556f),
    0.9
  );
  body.setStrokeStyle(2, 0x131a24, 0.32);

  const back = scene.add.rectangle(
    body.x,
    body.y - body.height / 2 + 7,
    body.width - 6,
    8,
    parseColor(item.backColor, 0xa087b0),
    0.85
  );

  layer.add(body);
  layer.add(back);
}

function addTable(scene, layer, item) {
  const table = scene.add.circle(
    toTileCenter(item.x),
    toTileCenter(item.y),
    item.radius || 12,
    parseColor(item.color, 0x7a4f3a),
    0.9
  );
  table.setStrokeStyle(2, 0x1b2431, 0.35);
  layer.add(table);
}

function addStools(scene, layer, item) {
  (item.positions || []).forEach((position) => {
    const stool = scene.add.circle(
      toTileCenter(position.x),
      toTileCenter(position.y),
      7,
      parseColor(item.color, 0xc67f53),
      0.88
    );
    stool.setStrokeStyle(1, 0x1a2430, 0.28);
    layer.add(stool);
  });
}

function addPlant(scene, layer, item) {
  const pot = scene.add.rectangle(
    toTileCenter(item.x),
    toTileCenter(item.y) + 9,
    14,
    12,
    parseColor(item.potColor, 0x855b3b),
    0.9
  );
  const leafOne = scene.add.circle(toTileCenter(item.x) - 5, toTileCenter(item.y) - 2, 8, parseColor(item.color, 0x6cb589), 0.9);
  const leafTwo = scene.add.circle(toTileCenter(item.x) + 5, toTileCenter(item.y) - 4, 9, parseColor(item.color, 0x6cb589), 0.9);
  const leafThree = scene.add.circle(toTileCenter(item.x), toTileCenter(item.y) - 10, 7, parseColor(item.color, 0x87cf9d), 0.85);
  layer.add(pot);
  layer.add(leafOne);
  layer.add(leafTwo);
  layer.add(leafThree);
}

function addCrate(scene, layer, item) {
  const graphics = scene.add.graphics();
  const left = toStageUnit(item.x) + 8;
  const top = toStageUnit(item.y) + 8;
  const width = (item.width || 1) * TILE_SIZE - 16;
  const height = (item.height || 1) * TILE_SIZE - 16;
  graphics.lineStyle(2, parseColor(item.lineColor, 0x2b3644), 0.42);
  graphics.fillStyle(parseColor(item.color, 0x7a6b56), 0.72);
  graphics.fillRect(left, top, width, height);
  graphics.strokeRect(left, top, width, height);
  graphics.lineBetween(left, top, left + width, top + height);
  graphics.lineBetween(left + width, top, left, top + height);
  layer.add(graphics);
}

function addPipe(scene, layer, item) {
  const width = Math.max(8, (item.width || 1) * TILE_SIZE - 12);
  const height = Math.max(8, (item.height || 1) * TILE_SIZE - 12);
  const pipe = scene.add.rectangle(
    toStageUnit(item.x) + (item.width || 1) * TILE_SIZE / 2,
    toStageUnit(item.y) + (item.height || 1) * TILE_SIZE / 2,
    width,
    height,
    parseColor(item.color, 0x8da1ba),
    0.5
  );
  pipe.setStrokeStyle(2, 0x151c27, 0.32);
  layer.add(pipe);
}

function addParkingLines(scene, layer, item) {
  const graphics = scene.add.graphics();
  graphics.lineStyle(2, parseColor(item.color, 0xf7fbff), 0.3);
  const count = item.count || 3;
  for (let index = 0; index < count; index += 1) {
    const offset = index * TILE_SIZE;
    graphics.lineBetween(
      toStageUnit(item.x) + offset,
      toStageUnit(item.y),
      toStageUnit(item.x) + offset + 20,
      toStageUnit(item.y + (item.height || 1))
    );
  }
  layer.add(graphics);
}

function addCar(scene, layer, item) {
  const body = scene.add.rectangle(
    toStageUnit(item.x) + (item.width || 1) * TILE_SIZE / 2,
    toStageUnit(item.y) + (item.height || 1) * TILE_SIZE / 2,
    (item.width || 1) * TILE_SIZE - 10,
    (item.height || 1) * TILE_SIZE - 14,
    parseColor(item.color, 0x9bbad1),
    0.88
  );
  body.setStrokeStyle(2, 0x18212d, 0.35);

  const windshield = scene.add.rectangle(
    body.x,
    body.y - 2,
    body.width - 22,
    body.height - 18,
    parseColor(item.windowColor, 0xdff7ff),
    0.4
  );

  const wheelOffsets = [
    [-body.width / 2 + 10, -body.height / 2 + 6],
    [body.width / 2 - 10, -body.height / 2 + 6],
    [-body.width / 2 + 10, body.height / 2 - 6],
    [body.width / 2 - 10, body.height / 2 - 6]
  ];

  layer.add(body);
  layer.add(windshield);
  wheelOffsets.forEach(([offsetX, offsetY]) => {
    const wheel = scene.add.circle(body.x + offsetX, body.y + offsetY, 4, 0x0d131b, 0.92);
    layer.add(wheel);
  });
}

function addDecor(scene, layer, room) {
  (room.decor || []).forEach((item) => {
    if (item.type === 'rug') {
      addRug(scene, layer, item);
      return;
    }

    if (item.type === 'counter') {
      addCounter(scene, layer, item);
      return;
    }

    if (item.type === 'sofa') {
      addSofa(scene, layer, item);
      return;
    }

    if (item.type === 'table') {
      addTable(scene, layer, item);
      return;
    }

    if (item.type === 'stools') {
      addStools(scene, layer, item);
      return;
    }

    if (item.type === 'plant') {
      addPlant(scene, layer, item);
      return;
    }

    if (item.type === 'crate') {
      addCrate(scene, layer, item);
      return;
    }

    if (item.type === 'pipe') {
      addPipe(scene, layer, item);
      return;
    }

    if (item.type === 'parking-lines') {
      addParkingLines(scene, layer, item);
      return;
    }

    if (item.type === 'car') {
      addCar(scene, layer, item);
      return;
    }

    if (item.type === 'sign') {
      const sign = scene.add.text(
        toStageUnit(item.x),
        toStageUnit(item.y),
        item.text,
        {
          fontFamily: 'Tahoma, Arial, sans-serif',
          fontSize: '12px',
          color: '#f5f9ff',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5);
      sign.setAlpha(0.9);
      layer.add(sign);
      return;
    }

    if (item.type === 'lamp') {
      const glow = scene.add.circle(
        toTileCenter(item.x),
        toTileCenter(item.y),
        item.radius || 12,
        parseColor(item.color, 0xfff0ad),
        0.2
      );
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.12, to: 0.28 },
        scale: { from: 0.95, to: 1.08 },
        duration: item.duration || 1600,
        yoyo: true,
        repeat: -1
      });
      layer.add(glow);
      return;
    }

    if (item.type === 'neon') {
      const neon = scene.add.rectangle(
        toStageUnit(item.x),
        toStageUnit(item.y),
        (item.width || 2) * TILE_SIZE,
        8,
        parseColor(item.color, 0xffffff),
        0.5
      );
      neon.setStrokeStyle(1, 0xf7fbff, 0.28);
      scene.tweens.add({
        targets: neon,
        alpha: { from: 0.32, to: 0.68 },
        duration: item.duration || 1300,
        yoyo: true,
        repeat: -1
      });
      layer.add(neon);
    }
  });
}

function addDoorMarkers(scene, layer, room) {
  room.doors.forEach((door) => {
    const container = scene.add.container(
      toTileCenter(door.x),
      toTileCenter(door.y)
    );
    const glow = scene.add.rectangle(
      0,
      0,
      TILE_SIZE - 4,
      TILE_SIZE - 4,
      parseColor(room.accent, 0x607894),
      0.1
    );
    const marker = scene.add.rectangle(
      0,
      0,
      TILE_SIZE - 14,
      TILE_SIZE - 14,
      parseColor(room.accent, 0x607894),
      0.2
    );
    marker.setStrokeStyle(2, 0xf1f6ff, 0.45);
    const arrow = scene.add.text(
      0,
      -6,
      'GO',
      {
        fontFamily: 'Tahoma, Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#f7fbff'
      }
    ).setOrigin(0.5);
    const label = scene.add.text(
      0,
      TILE_SIZE / 2 - 6,
      door.label,
      {
        fontFamily: 'Tahoma, Arial, sans-serif',
        fontSize: '10px',
        color: '#f5f9ff'
      }
    ).setOrigin(0.5);
    label.setAlpha(0.88);
    container.add([glow, marker, arrow, label]);
    container.setSize(TILE_SIZE - 4, TILE_SIZE - 4);
    container.setInteractive();

    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.2 },
      scaleX: { from: 0.94, to: 1.06 },
      scaleY: { from: 0.94, to: 1.06 },
      duration: 1150,
      yoyo: true,
      repeat: -1
    });

    container.on('pointerover', () => {
      marker.setAlpha(0.34);
      glow.setAlpha(0.32);
      label.setAlpha(1);
      container.setScale(1.04);
    });
    container.on('pointerout', () => {
      marker.setAlpha(0.2);
      glow.setAlpha(0.12);
      label.setAlpha(0.88);
      container.setScale(1);
    });
    container.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      if (typeof scene.onTileActivate === 'function') {
        scene.onTileActivate({ x: door.x, y: door.y });
      }
    });

    layer.add(container);
  });
}

function addHotspotMarkers(scene, layer, room, activeHotspotId, onHotspotActivate) {
  (room.hotspots || []).forEach((hotspot) => {
    const width = (hotspot.width || 1) * TILE_SIZE - 12;
    const height = (hotspot.height || 1) * TILE_SIZE - 12;
    const centerX = toStageUnit(hotspot.x) + (hotspot.width || 1) * TILE_SIZE / 2;
    const centerY = toStageUnit(hotspot.y) + (hotspot.height || 1) * TILE_SIZE / 2;
    const isActive = hotspot.id === activeHotspotId;
    const accent = parseColor(hotspot.accent || room.accent, 0x90b8ff);

    const container = scene.add.container(centerX, centerY);
    const pulse = scene.add.rectangle(0, 0, width + 8, height + 8, accent, isActive ? 0.18 : 0.08);
    const marker = scene.add.rectangle(0, 0, width, height, accent, isActive ? 0.22 : 0.08);
    marker.setStrokeStyle(2, 0xf4f8ff, isActive ? 0.5 : 0.18);

    const label = scene.add.text(
      0,
      -Math.max(14, height / 2 + 12),
      hotspot.label,
      {
        fontFamily: 'Tahoma, Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#f6fbff',
        backgroundColor: 'rgba(12,18,28,0.72)',
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
      }
    ).setOrigin(0.5);
    label.setAlpha(isActive ? 0.98 : 0.82);

    const icon = scene.add.text(
      0,
      0,
      hotspot.icon || '!',
      {
        fontFamily: 'Tahoma, Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f6fbff'
      }
    ).setOrigin(0.5);

    container.add([pulse, marker, icon, label]);
    container.setSize(width + 8, height + 8);
    container.setInteractive();

    scene.tweens.add({
      targets: pulse,
      alpha: { from: isActive ? 0.18 : 0.08, to: isActive ? 0.28 : 0.16 },
      scaleX: { from: 0.98, to: 1.03 },
      scaleY: { from: 0.98, to: 1.03 },
      duration: 1200,
      yoyo: true,
      repeat: -1
    });

    container.on('pointerover', () => {
      marker.setAlpha(isActive ? 0.3 : 0.18);
      label.setAlpha(1);
      container.setScale(1.02);
    });
    container.on('pointerout', () => {
      marker.setAlpha(isActive ? 0.22 : 0.08);
      label.setAlpha(isActive ? 0.98 : 0.82);
      container.setScale(1);
    });
    container.on('pointerdown', (pointer, localX, localY, event) => {
      event?.stopPropagation?.();
      onHotspotActivate?.(hotspot);
    });

    layer.add(container);
  });
}

export function drawChabloRoom(scene, layer, room, handlers = {}) {
  layer.removeAll(true);
  const {
    activeHotspotId = null,
    onHotspotActivate,
    onTileActivate
  } = handlers;
  scene.onTileActivate = onTileActivate;

  const roomWidth = room.layout[0].length * TILE_SIZE;
  const roomHeight = room.layout.length * TILE_SIZE;

  const shell = scene.add.rectangle(
    STAGE_PADDING + roomWidth / 2,
    STAGE_PADDING + roomHeight / 2,
    roomWidth + 18,
    roomHeight + 18,
    0x101823,
    0.42
  );
  shell.setStrokeStyle(1, 0xd6e6ff, 0.09);
  layer.add(shell);

  const sheen = scene.add.rectangle(
    STAGE_PADDING + roomWidth / 2,
    STAGE_PADDING + 26,
    roomWidth - 10,
    24,
    0xf7fbff,
    0.035
  );
  layer.add(sheen);

  room.layout.forEach((row, rowIndex) => {
    row.split('').forEach((tileCode, columnIndex) => {
      const tile = scene.add.rectangle(
        STAGE_PADDING + columnIndex * TILE_SIZE + TILE_SIZE / 2,
        STAGE_PADDING + rowIndex * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE - 6,
        TILE_SIZE - 6,
        getTileFill(room, tileCode),
        getTileAlpha(tileCode)
      );
      tile.setStrokeStyle(1, 0xf2f7ff, tileCode === '.' ? 0.05 : 0.12);
      if (!BLOCKED_TILE_CODES.has(tileCode) && typeof onTileActivate === 'function') {
        tile.setInteractive();
        tile.on('pointerdown', (pointer, localX, localY, event) => {
          event?.stopPropagation?.();
          onTileActivate({ x: columnIndex, y: rowIndex });
        });
      }
      layer.add(tile);
    });
  });

  addDecor(scene, layer, room);
  addDoorMarkers(scene, layer, room);
  addHotspotMarkers(scene, layer, room, activeHotspotId, onHotspotActivate);

  return {
    width: roomWidth + STAGE_PADDING * 2,
    height: roomHeight + STAGE_PADDING * 2
  };
}
