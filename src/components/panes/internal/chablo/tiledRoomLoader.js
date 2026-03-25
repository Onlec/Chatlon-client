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
    decor: (room.decor || []).map((item) => scaleDecorItem(item, scale))
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

function buildLayoutFromTileLayers(map, resolveTile) {
  const width = Number(map.width) || 0;
  const height = Number(map.height) || 0;
  const layout = Array.from({ length: height }, () => Array.from({ length: width }, () => '.'));

  flattenLayers(map.layers)
    .filter((layer) => layer.type === 'tilelayer' && Array.isArray(layer.data) && layer.visible !== false)
    .forEach((layer) => {
      layer.data.forEach((gid, index) => {
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

function parseObjects(map) {
  const objects = flattenLayers(map.layers)
    .filter((layer) => layer.type === 'objectgroup' && Array.isArray(layer.objects) && layer.visible !== false)
    .flatMap((layer) => layer.objects);

  let spawn = null;
  const doors = [];
  const decor = [];
  const stoolGroups = new Map();

  objects.forEach((object) => {
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

    if (object.type === 'door') {
      const door = parseDoorObject(object, map);
      if (door) {
        doors.push(door);
      }
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

  return {
    spawn,
    doors,
    decor
  };
}

export function compileChabloRoomFromTiledMap(map) {
  if (!map || map.type !== 'map') {
    throw new Error('Expected a Tiled JSON map object.');
  }

  if (map.orientation !== 'orthogonal') {
    throw new Error(`Unsupported Tiled map orientation "${map.orientation}".`);
  }

  const properties = getPropertyMap(map.properties);
  const resolveTile = buildTilesetResolver(map);
  const parsed = parseObjects(map);
  const scale = Math.max(1, Number(properties.roomScale ?? properties.scale ?? 1) || 1);

  const baseRoom = {
    id: properties.id || map.name,
    name: properties.name || map.name || 'Unnamed room',
    description: properties.description || '',
    accent: properties.accent || '#607894',
    layout: buildLayoutFromTileLayers(map, resolveTile),
    spawn: parsed.spawn || { x: 0, y: 0 },
    doors: parsed.doors,
    decor: parsed.decor
  };

  if (typeof baseRoom.id !== 'string' || !baseRoom.id) {
    throw new Error('Tiled room is missing an "id" property.');
  }

  return scaleRoom(baseRoom, scale);
}

export default compileChabloRoomFromTiledMap;
