const AREA_DECOR_TYPES = new Set([
  'rug',
  'counter',
  'sofa',
  'crate',
  'pipe',
  'parking-lines',
  'car',
  'neon',
  'sign'
]);

const POINT_DECOR_TYPES = new Set([
  'table',
  'plant',
  'lamp'
]);

const OBJECT_LAYER_NAME = 'objects';
const DECOR_LAYER_NAME = 'decor';
const LAYOUT_LAYER_NAME = 'layout';
const HOTSPOTS_LAYER_NAME = 'hotspots';
const SUPPORTED_DECOR_TYPES = new Set([
  ...AREA_DECOR_TYPES,
  ...POINT_DECOR_TYPES,
  'stool'
]);
const SUPPORTED_HOTSPOT_ACTION_TYPES = new Set([
  'bulletin',
  'feedback',
  'prefill-chat',
  'room-jump'
]);

export const CHABLO_TILED_CONVENTIONS = {
  layoutLayerName: LAYOUT_LAYER_NAME,
  objectLayerName: OBJECT_LAYER_NAME,
  decorLayerName: DECOR_LAYER_NAME,
  hotspotLayerName: HOTSPOTS_LAYER_NAME,
  requiredMapProperties: ['id', 'name', 'accent', 'roomScale'],
  supportedObjectTypes: {
    objects: ['spawn', 'door'],
    decor: Array.from(SUPPORTED_DECOR_TYPES),
    hotspots: ['hotspot']
  }
};

function getPropertyMap(properties = []) {
  return properties.reduce((next, property) => {
    if (!property || typeof property.name !== 'string') {
      return next;
    }
    next[property.name] = property.value;
    return next;
  }, {});
}

function scaleAreaCoordinate(value, scale) {
  return value * scale;
}

function scalePointCoordinate(value, scale) {
  return (value * scale) + Math.floor(scale / 2);
}

function scaleLayout(layout, scale) {
  return layout.flatMap((row) => {
    const expandedRow = row.split('').map((tile) => tile.repeat(scale)).join('');
    return Array.from({ length: scale }, () => expandedRow);
  });
}

function scaleDecorItem(item, scale) {
  if (AREA_DECOR_TYPES.has(item.type)) {
    return {
      ...item,
      x: scaleAreaCoordinate(item.x, scale),
      y: scaleAreaCoordinate(item.y, scale),
      width: typeof item.width === 'number' ? item.width * scale : item.width,
      height: typeof item.height === 'number' ? item.height * scale : item.height,
      count: typeof item.count === 'number' ? item.count * scale : item.count,
      renderScale: scale
    };
  }

  if (POINT_DECOR_TYPES.has(item.type)) {
    return {
      ...item,
      x: scalePointCoordinate(item.x, scale),
      y: scalePointCoordinate(item.y, scale),
      radius: typeof item.radius === 'number' ? item.radius * scale : item.radius,
      renderScale: scale
    };
  }

  if (item.type === 'stools') {
    return {
      ...item,
      positions: (item.positions || []).map((position) => ({
        x: scalePointCoordinate(position.x, scale),
        y: scalePointCoordinate(position.y, scale)
      })),
      renderScale: scale
    };
  }

  return {
    ...item,
    renderScale: scale
  };
}

function scaleHotspot(item, scale) {
  return {
    ...item,
    x: scaleAreaCoordinate(item.x, scale),
    y: scaleAreaCoordinate(item.y, scale),
    width: typeof item.width === 'number' ? item.width * scale : item.width,
    height: typeof item.height === 'number' ? item.height * scale : item.height,
    target: {
      x: scalePointCoordinate(item.target.x, scale),
      y: scalePointCoordinate(item.target.y, scale)
    },
    renderScale: scale
  };
}

function scaleRoom(room, scale) {
  if (scale <= 1) {
    return {
      ...room,
      scale
    };
  }

  return {
    ...room,
    scale,
    layout: scaleLayout(room.layout, scale),
    spawn: {
      x: scalePointCoordinate(room.spawn.x, scale),
      y: scalePointCoordinate(room.spawn.y, scale)
    },
    doors: room.doors.map((door) => ({
      ...door,
      x: scalePointCoordinate(door.x, scale),
      y: scalePointCoordinate(door.y, scale),
      spawn: {
        x: scalePointCoordinate(door.spawn.x, scale),
        y: scalePointCoordinate(door.spawn.y, scale)
      }
    })),
    decor: (room.decor || []).map((item) => scaleDecorItem(item, scale)),
    hotspots: (room.hotspots || []).map((item) => scaleHotspot(item, scale))
  };
}

function flattenLayers(layers = []) {
  return layers.flatMap((layer) => {
    if (!layer) {
      return [];
    }
    if (layer.type === 'group') {
      return flattenLayers(layer.layers || []);
    }
    return [layer];
  });
}

function getRequiredLayer(map, layerName, expectedType) {
  const layer = flattenLayers(map.layers).find(
    (candidate) => candidate?.name === layerName && candidate?.type === expectedType
  );

  if (!layer) {
    throw new Error(`Tiled room "${map.name || 'unknown'}" mist verplichte ${expectedType}-laag "${layerName}".`);
  }

  return layer;
}

function getOptionalLayer(map, layerName, expectedType) {
  return flattenLayers(map.layers).find(
    (candidate) => candidate?.name === layerName && candidate?.type === expectedType
  ) || null;
}

function assertMapProperty(properties, propertyName, mapName) {
  const value = properties[propertyName];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Tiled room "${mapName}" mist verplichte map property "${propertyName}".`);
  }
}

function validateObjectsLayer(map, layer) {
  const spawnObjects = [];

  (layer.objects || []).forEach((object) => {
    if (!object || typeof object.type !== 'string') {
      throw new Error(`Tiled room "${map.name}" bevat een object zonder geldig type in laag "${OBJECT_LAYER_NAME}".`);
    }

    if (object.type === 'spawn') {
      spawnObjects.push(object);
      return;
    }

    if (object.type !== 'door') {
      throw new Error(
        `Tiled room "${map.name}" gebruikt ongeldige objecttype "${object.type}" in laag "${OBJECT_LAYER_NAME}".`
      );
    }

    const properties = getPropertyMap(object.properties);
    const to = properties.to || properties.targetRoom;
    const hasSpawnX = Number.isFinite(Number(properties.spawnX ?? properties.targetSpawnX));
    const hasSpawnY = Number.isFinite(Number(properties.spawnY ?? properties.targetSpawnY));

    if (typeof to !== 'string' || !to) {
      throw new Error(`Door "${object.name || 'unnamed'}" in room "${map.name}" mist property "to".`);
    }

    if (!hasSpawnX || !hasSpawnY) {
      throw new Error(`Door "${object.name || 'unnamed'}" in room "${map.name}" mist geldige spawnX/spawnY properties.`);
    }
  });

  if (spawnObjects.length !== 1) {
    throw new Error(`Tiled room "${map.name}" moet exact 1 spawn object hebben; gevonden: ${spawnObjects.length}.`);
  }
}

function validateDecorLayer(map, layer) {
  (layer.objects || []).forEach((object) => {
    if (!object || typeof object.type !== 'string') {
      throw new Error(`Tiled room "${map.name}" bevat een decorobject zonder geldig type.`);
    }

    if (!SUPPORTED_DECOR_TYPES.has(object.type)) {
      throw new Error(`Tiled room "${map.name}" gebruikt niet-ondersteund decor type "${object.type}".`);
    }
  });
}

function validateHotspotsLayer(map, layer) {
  if (!layer) {
    return;
  }

  (layer.objects || []).forEach((object) => {
    if (!object || object.type !== 'hotspot') {
      throw new Error(`Tiled room "${map.name}" gebruikt ongeldige hotspot objecttype "${object?.type || 'unknown'}".`);
    }

    const properties = getPropertyMap(object.properties);
    const label = properties.label || object.name;
    const hasTargetX = Number.isFinite(Number(properties.targetX));
    const hasTargetY = Number.isFinite(Number(properties.targetY));
    const actionType = properties.actionType;

    if (typeof label !== 'string' || !label) {
      throw new Error(`Hotspot in room "${map.name}" mist een label of naam.`);
    }

    if (!hasTargetX || !hasTargetY) {
      throw new Error(`Hotspot "${label}" in room "${map.name}" mist geldige targetX/targetY properties.`);
    }

    if (actionType !== undefined && !SUPPORTED_HOTSPOT_ACTION_TYPES.has(actionType)) {
      throw new Error(`Hotspot "${label}" in room "${map.name}" gebruikt niet-ondersteund actionType "${actionType}".`);
    }

    if (actionType === 'prefill-chat' && typeof properties.actionText !== 'string') {
      throw new Error(`Hotspot "${label}" in room "${map.name}" met actionType "prefill-chat" mist property "actionText".`);
    }

    if (actionType === 'room-jump' && typeof properties.actionRoom !== 'string') {
      throw new Error(`Hotspot "${label}" in room "${map.name}" met actionType "room-jump" mist property "actionRoom".`);
    }
  });
}

export function validateChabloTiledMap(map) {
  if (!map || map.type !== 'map') {
    throw new Error('Expected a Tiled JSON map object.');
  }

  if (map.orientation !== 'orthogonal') {
    throw new Error(`Unsupported Tiled map orientation "${map.orientation}".`);
  }

  if (!Number.isFinite(Number(map.width)) || !Number.isFinite(Number(map.height)) || map.width <= 0 || map.height <= 0) {
    throw new Error(`Tiled room "${map.name || 'unknown'}" heeft ongeldige width/height.`);
  }

  if (!Number.isFinite(Number(map.tilewidth)) || !Number.isFinite(Number(map.tileheight)) || map.tilewidth <= 0 || map.tileheight <= 0) {
    throw new Error(`Tiled room "${map.name || 'unknown'}" heeft ongeldige tilewidth/tileheight.`);
  }

  const properties = getPropertyMap(map.properties);
  CHABLO_TILED_CONVENTIONS.requiredMapProperties.forEach((propertyName) => {
    assertMapProperty(properties, propertyName, map.name || 'unknown');
  });

  const layoutLayer = getRequiredLayer(map, LAYOUT_LAYER_NAME, 'tilelayer');
  const objectsLayer = getRequiredLayer(map, OBJECT_LAYER_NAME, 'objectgroup');
  const decorLayer = getRequiredLayer(map, DECOR_LAYER_NAME, 'objectgroup');
  const hotspotsLayer = getOptionalLayer(map, HOTSPOTS_LAYER_NAME, 'objectgroup');

  if (!Array.isArray(layoutLayer.data) || layoutLayer.data.length !== map.width * map.height) {
    throw new Error(`Tiled room "${map.name}" heeft een ongeldige layout data lengte.`);
  }

  validateObjectsLayer(map, objectsLayer);
  validateDecorLayer(map, decorLayer);
  validateHotspotsLayer(map, hotspotsLayer);

  return {
    properties,
    layoutLayer,
    objectsLayer,
    decorLayer,
    hotspotsLayer
  };
}

function buildTilesetResolver(map) {
  const tilesets = [...(map.tilesets || [])]
    .filter((tileset) => typeof tileset.firstgid === 'number')
    .map((tileset) => ({
      ...tileset,
      tileMap: new Map((tileset.tiles || []).map((tile) => [tile.id, tile]))
    }))
    .sort((left, right) => right.firstgid - left.firstgid);

  return (gid) => {
    if (!gid) {
      return null;
    }

    const tileset = tilesets.find((candidate) => gid >= candidate.firstgid);
    if (!tileset) {
      return null;
    }

    const localId = gid - tileset.firstgid;
    const tile = tileset.tileMap.get(localId) || null;
    const properties = getPropertyMap(tile?.properties);

    return {
      gid,
      localId,
      tile,
      properties,
      type: tile?.type || tile?.class || properties.type || null
    };
  };
}

function toTileCoordinate(pixelValue, tileSize) {
  return Math.round(Number(pixelValue || 0) / tileSize);
}

function toTileSpan(pixelValue, tileSize) {
  const span = Math.round(Number(pixelValue || 0) / tileSize);
  return Math.max(1, span);
}

function buildLayoutFromTileLayer(map, layoutLayer, resolveTile) {
  const width = Number(map.width) || 0;
  const height = Number(map.height) || 0;
  const layout = Array.from({ length: height }, () => Array.from({ length: width }, () => '.'));

  layoutLayer.data.forEach((gid, index) => {
    const tile = resolveTile(gid);
    const code = tile?.properties?.code;
    if (typeof code !== 'string' || !code) {
      return;
    }
    const x = index % width;
    const y = Math.floor(index / width);
    if (layout[y]) {
      layout[y][x] = code;
    }
  });

  return layout.map((row) => row.join(''));
}

function parseDoorObject(object, map) {
  const properties = getPropertyMap(object.properties);
  const to = properties.to || properties.targetRoom;
  if (typeof to !== 'string' || !to) {
    return null;
  }

  return {
    x: toTileCoordinate(object.x, map.tilewidth),
    y: toTileCoordinate(object.y, map.tileheight),
    to,
    label: properties.label || object.name || to,
    spawn: {
      x: Number(properties.spawnX ?? properties.targetSpawnX ?? 0),
      y: Number(properties.spawnY ?? properties.targetSpawnY ?? 0)
    }
  };
}

function parseDecorObject(object, map) {
  const properties = getPropertyMap(object.properties);
  const item = {
    type: object.type
  };

  if (AREA_DECOR_TYPES.has(object.type)) {
    item.x = toTileCoordinate(object.x, map.tilewidth);
    item.y = toTileCoordinate(object.y, map.tileheight);
    item.width = toTileSpan(object.width, map.tilewidth);
    item.height = toTileSpan(object.height, map.tileheight);
  } else if (POINT_DECOR_TYPES.has(object.type) || object.type === 'stool') {
    item.x = toTileCoordinate(object.x, map.tilewidth);
    item.y = toTileCoordinate(object.y, map.tileheight);
  } else {
    item.x = toTileCoordinate(object.x, map.tilewidth);
    item.y = toTileCoordinate(object.y, map.tileheight);
  }

  Object.entries(properties).forEach(([key, value]) => {
    item[key] = value;
  });

  if (object.type === 'sign' && typeof item.text !== 'string') {
    item.text = object.text?.text || object.name || '';
  }

  return item;
}

function parseObjectsLayer(layer, map) {
  let spawn = null;
  const doors = [];

  (layer.objects || []).forEach((object) => {
    if (!object || typeof object.type !== 'string') {
      return;
    }

    if (object.type === 'spawn') {
      spawn = {
        x: toTileCoordinate(object.x, map.tilewidth),
        y: toTileCoordinate(object.y, map.tileheight)
      };
      return;
    }

    const door = parseDoorObject(object, map);
    if (door) {
      doors.push(door);
    }
  });

  return {
    spawn,
    doors
  };
}

function parseDecorLayer(layer, map) {
  const decor = [];
  const stoolGroups = new Map();

  (layer.objects || []).forEach((object) => {
    if (!object || typeof object.type !== 'string') {
      return;
    }

    if (object.type === 'stool') {
      const properties = getPropertyMap(object.properties);
      const groupKey = `${object.name || 'default'}::${properties.color || ''}`;
      if (!stoolGroups.has(groupKey)) {
        stoolGroups.set(groupKey, {
          type: 'stools',
          color: properties.color,
          positions: []
        });
      }
      stoolGroups.get(groupKey).positions.push({
        x: toTileCoordinate(object.x, map.tilewidth),
        y: toTileCoordinate(object.y, map.tileheight)
      });
      return;
    }

    decor.push(parseDecorObject(object, map));
  });

  stoolGroups.forEach((group) => {
    decor.push(group);
  });

  return decor;
}

function parseHotspotsLayer(layer, map) {
  if (!layer) {
    return [];
  }

  return (layer.objects || []).map((object) => {
    const properties = getPropertyMap(object.properties);
    const actionType = properties.actionType;
    return {
      id: properties.id || object.name || `hotspot-${object.id}`,
      kind: properties.kind || 'generic',
      label: properties.label || object.name || 'Hotspot',
      description: properties.description || '',
      feedback: properties.feedback || '',
      actionLabel: properties.actionLabel || 'Ga erheen',
      icon: properties.icon || '!',
      accent: properties.accent || null,
      x: toTileCoordinate(object.x, map.tilewidth),
      y: toTileCoordinate(object.y, map.tileheight),
      width: toTileSpan(object.width, map.tilewidth),
      height: toTileSpan(object.height, map.tileheight),
      target: {
        x: Number(properties.targetX),
        y: Number(properties.targetY)
      },
      action: actionType ? {
        type: actionType,
        title: properties.actionTitle || '',
        text: properties.actionText || '',
        message: properties.actionMessage || '',
        buttonLabel: properties.actionButton || '',
        roomId: properties.actionRoom || '',
        target: Number.isFinite(Number(properties.actionTargetX)) && Number.isFinite(Number(properties.actionTargetY))
          ? {
            x: Number(properties.actionTargetX),
            y: Number(properties.actionTargetY)
          }
          : null
      } : null
    };
  });
}

export function compileChabloRoomFromTiledMap(map) {
  const validated = validateChabloTiledMap(map);
  const { properties, layoutLayer, objectsLayer, decorLayer, hotspotsLayer } = validated;
  const resolveTile = buildTilesetResolver(map);
  const parsedObjects = parseObjectsLayer(objectsLayer, map);
  const decor = parseDecorLayer(decorLayer, map);
  const hotspots = parseHotspotsLayer(hotspotsLayer, map);
  const scale = Math.max(1, Number(properties.roomScale ?? properties.scale ?? 1) || 1);

  const baseRoom = {
    id: properties.id || map.name,
    name: properties.name || map.name || 'Unnamed room',
    description: properties.description || '',
    accent: properties.accent || '#607894',
    layout: buildLayoutFromTileLayer(map, layoutLayer, resolveTile),
    spawn: parsedObjects.spawn || { x: 0, y: 0 },
    doors: parsedObjects.doors,
    decor,
    hotspots
  };

  if (typeof baseRoom.id !== 'string' || !baseRoom.id) {
    throw new Error('Tiled room is missing an "id" property.');
  }

  return scaleRoom(baseRoom, scale);
}

export default compileChabloRoomFromTiledMap;
