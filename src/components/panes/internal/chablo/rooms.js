export const DEFAULT_CHABLO_ROOM_ID = 'receptie';
export const CHABLO_ROOM_SCALE = 2;

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

const BASE_CHABLO_ROOMS = [
  {
    id: 'receptie',
    name: 'Receptie',
    description: 'De lobby waar iedereen binnenvalt met een dramatische statusboodschap.',
    accent: '#f0c97c',
    layout: [
      '##########',
      '#........#',
      '#..##....#',
      '#........#',
      '#....##..#',
      '#........#',
      '##########'
    ],
    spawn: { x: 4, y: 3 },
    doors: [
      { x: 8, y: 3, to: 'bar', spawn: { x: 1, y: 3 }, label: 'Bar' },
      { x: 4, y: 5, to: 'kelder', spawn: { x: 4, y: 1 }, label: 'Kelder' },
      { x: 1, y: 3, to: 'parking', spawn: { x: 8, y: 3 }, label: 'Parking' }
    ],
    decor: [
      { type: 'sign', x: 4, y: 0, width: 2, text: 'Lobby' },
      { type: 'rug', x: 2, y: 2, width: 6, height: 2, color: '#536c88', borderColor: '#f0c97c', alpha: 0.28 },
      { type: 'counter', x: 2, y: 5, width: 4, height: 1, color: '#6b4d3a', topColor: '#d7b38d' },
      { type: 'sofa', x: 6, y: 5, width: 2, height: 1, color: '#7e6d92', backColor: '#b39ec4' },
      { type: 'plant', x: 1, y: 5, color: '#79c196', potColor: '#8b5e40' },
      { type: 'plant', x: 8, y: 5, color: '#79c196', potColor: '#8b5e40' },
      { type: 'lamp', x: 2, y: 1, color: '#ffe9a6' },
      { type: 'lamp', x: 7, y: 1, color: '#ffe9a6' }
    ]
  },
  {
    id: 'bar',
    name: 'De Bar',
    description: 'Neon, plakkerige tafels en mensen die doen alsof ze AFK zijn.',
    accent: '#d5765c',
    layout: [
      '##########',
      '#..TT....#',
      '#..TT....#',
      '#........#',
      '#....BB..#',
      '#....BB..#',
      '##########'
    ],
    spawn: { x: 1, y: 3 },
    doors: [
      { x: 1, y: 3, to: 'receptie', spawn: { x: 7, y: 3 }, label: 'Receptie' }
    ],
    decor: [
      { type: 'sign', x: 4, y: 0, width: 2, text: 'Neon Bar' },
      { type: 'counter', x: 6, y: 4, width: 2, height: 2, color: '#69422f', topColor: '#de9d74' },
      { type: 'table', x: 2, y: 3, color: '#86553d', radius: 13 },
      { type: 'table', x: 4, y: 4, color: '#86553d', radius: 13 },
      { type: 'stools', positions: [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 6, y: 5 }, { x: 7, y: 5 }], color: '#d48b5d' },
      { type: 'rug', x: 1, y: 4, width: 3, height: 1, color: '#5e3144', borderColor: '#ff9468', alpha: 0.24 },
      { type: 'neon', x: 7, y: 1, width: 2, color: '#ff9468' },
      { type: 'neon', x: 2, y: 1, width: 2, color: '#ffb37a', duration: 980 },
      { type: 'lamp', x: 2, y: 5, color: '#ffd2a5' }
    ]
  },
  {
    id: 'kelder',
    name: 'De Kelder',
    description: 'Iets te donker, iets te mysterieus, maar wel gezellig voor whispers.',
    accent: '#6f7ccf',
    layout: [
      '##########',
      '#........#',
      '#.C....C.#',
      '#........#',
      '#..####..#',
      '#........#',
      '##########'
    ],
    spawn: { x: 4, y: 1 },
    doors: [
      { x: 4, y: 1, to: 'receptie', spawn: { x: 4, y: 4 }, label: 'Receptie' }
    ],
    decor: [
      { type: 'sign', x: 4, y: 0, width: 2, text: 'Kelder' },
      { type: 'crate', x: 1, y: 5, width: 1, height: 1, color: '#78654f' },
      { type: 'crate', x: 8, y: 5, width: 1, height: 1, color: '#78654f' },
      { type: 'pipe', x: 1, y: 1, width: 1, height: 5, color: '#8395aa' },
      { type: 'pipe', x: 8, y: 1, width: 1, height: 5, color: '#8395aa' },
      { type: 'rug', x: 3, y: 5, width: 2, height: 1, color: '#2d3954', borderColor: '#8f9cff', alpha: 0.22 },
      { type: 'neon', x: 2, y: 5, width: 2, color: '#8f9cff' },
      { type: 'lamp', x: 7, y: 5, color: '#c7d0ff' }
    ]
  },
  {
    id: 'parking',
    name: 'Parking',
    description: 'Waar je zogezegd weggaat, maar stiekem toch blijft hangen.',
    accent: '#74c29b',
    layout: [
      '##########',
      '#..PPPP..#',
      '#........#',
      '#........#',
      '#..PPPP..#',
      '#........#',
      '##########'
    ],
    spawn: { x: 8, y: 3 },
    doors: [
      { x: 8, y: 3, to: 'receptie', spawn: { x: 2, y: 3 }, label: 'Receptie' }
    ],
    decor: [
      { type: 'sign', x: 4, y: 0, width: 2, text: 'Parking' },
      { type: 'parking-lines', x: 2, y: 1, height: 5, count: 5, color: '#f7fbff' },
      { type: 'car', x: 6, y: 2, width: 2, height: 2, color: '#8db1c8', windowColor: '#e0fbff' },
      { type: 'rug', x: 6, y: 5, width: 2, height: 1, color: '#3b4b60', borderColor: '#bdf5d0', alpha: 0.14 },
      { type: 'lamp', x: 2, y: 1, color: '#bdf5d0' },
      { type: 'lamp', x: 7, y: 1, color: '#bdf5d0' }
    ]
  }
];

export const CHABLO_ROOMS = BASE_CHABLO_ROOMS.map((room) => scaleRoom(room, CHABLO_ROOM_SCALE));

const ROOM_MAP = CHABLO_ROOMS.reduce((next, room) => {
  next[room.id] = room;
  return next;
}, {});

export function getChabloRoom(roomId) {
  return ROOM_MAP[roomId] || ROOM_MAP[DEFAULT_CHABLO_ROOM_ID];
}

export function getChabloRoomSpawnPosition(roomId) {
  const room = getChabloRoom(roomId);
  return { ...room.spawn };
}

export function getChabloRoomDimensions(roomId) {
  const room = getChabloRoom(roomId);
  return {
    width: room.layout[0]?.length || 0,
    height: room.layout.length
  };
}
