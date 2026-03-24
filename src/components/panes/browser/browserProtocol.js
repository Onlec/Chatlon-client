export const CLIENT_BINARY_OPCODE = {
  MOVE: 0x01,
  WHEEL: 0x02,
  CLICK: 0x03,
  DBLCLICK: 0x04
};

export const SERVER_BINARY_OPCODE = {
  FRAME: 0x20
};

export const FRAME_MIME_CODE = {
  JPEG: 0x01
};

function clampUnsigned16(value) {
  return Math.max(0, Math.min(0xffff, Math.round(Number(value) || 0)));
}

function clampSigned16(value) {
  return Math.max(-0x8000, Math.min(0x7fff, Math.round(Number(value) || 0)));
}

function encodePointerPacket(opcode, x, y, button) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint8(0, opcode);
  view.setUint16(1, 5, true);
  view.setUint16(3, clampUnsigned16(x), true);
  view.setUint16(5, clampUnsigned16(y), true);
  view.setUint8(7, button);
  return buffer;
}

export function encodeMovePacket(x, y) {
  const buffer = new ArrayBuffer(7);
  const view = new DataView(buffer);
  view.setUint8(0, CLIENT_BINARY_OPCODE.MOVE);
  view.setUint16(1, 4, true);
  view.setUint16(3, clampUnsigned16(x), true);
  view.setUint16(5, clampUnsigned16(y), true);
  return buffer;
}

export function encodeWheelPacket(deltaX, deltaY) {
  const buffer = new ArrayBuffer(7);
  const view = new DataView(buffer);
  view.setUint8(0, CLIENT_BINARY_OPCODE.WHEEL);
  view.setUint16(1, 4, true);
  view.setInt16(3, clampSigned16(deltaX), true);
  view.setInt16(5, clampSigned16(deltaY), true);
  return buffer;
}

export function encodeClickPacket(x, y, button) {
  return encodePointerPacket(CLIENT_BINARY_OPCODE.CLICK, x, y, button);
}

export function encodeDoubleClickPacket(x, y, button) {
  return encodePointerPacket(CLIENT_BINARY_OPCODE.DBLCLICK, x, y, button);
}

export function parseFramePacket(packet) {
  const bytes = packet instanceof ArrayBuffer ? packet : packet?.buffer;
  if (!(bytes instanceof ArrayBuffer)) {
    throw new Error('Unsupported browser frame payload.');
  }

  const view = new DataView(bytes);
  if (view.byteLength < 6) {
    throw new Error('Browser frame packet is too short.');
  }

  const opcode = view.getUint8(0);
  if (opcode !== SERVER_BINARY_OPCODE.FRAME) {
    throw new Error(`Unknown browser frame opcode: ${opcode}`);
  }

  const frameVersion = view.getUint32(1, true);
  const mimeCode = view.getUint8(5);
  const mimeType = mimeCode === FRAME_MIME_CODE.JPEG ? 'image/jpeg' : null;
  if (!mimeType) {
    throw new Error(`Unknown browser frame mime code: ${mimeCode}`);
  }

  return {
    frameVersion,
    mimeType,
    bytes: bytes.slice(6)
  };
}
