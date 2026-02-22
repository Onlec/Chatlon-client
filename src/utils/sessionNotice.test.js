import {
  createConflictSessionNotice,
  saveSessionNotice,
  loadSessionNotice,
  clearSessionNotice
} from './sessionNotice';

function createStorageMock() {
  const store = {};
  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    })
  };
}

describe('sessionNotice', () => {
  test('createConflictSessionNotice returns expected shape', () => {
    const notice = createConflictSessionNotice(1000);
    expect(notice).toEqual({
      id: 'conflict_1000',
      type: 'conflict',
      title: 'Sessie beeindigd',
      message: 'Je bent aangemeld op een andere locatie. Deze sessie is afgesloten.',
      createdAt: 1000
    });
  });

  test('save + load roundtrip works for valid notice', () => {
    const storage = createStorageMock();
    const notice = createConflictSessionNotice(1000);
    saveSessionNotice(notice, storage);

    const loaded = loadSessionNotice({
      nowMs: 2000,
      ttlMs: 5 * 60 * 1000,
      storageOverride: storage
    });

    expect(loaded).toEqual(notice);
  });

  test('loadSessionNotice clears expired notice', () => {
    const storage = createStorageMock();
    const notice = createConflictSessionNotice(1000);
    saveSessionNotice(notice, storage);

    const loaded = loadSessionNotice({
      nowMs: 1000 + 5 * 60 * 1000 + 1,
      ttlMs: 5 * 60 * 1000,
      storageOverride: storage
    });

    expect(loaded).toBeNull();
    expect(storage.removeItem).toHaveBeenCalled();
  });

  test('clearSessionNotice removes persisted notice', () => {
    const storage = createStorageMock();
    const notice = createConflictSessionNotice(1000);
    saveSessionNotice(notice, storage);
    clearSessionNotice(storage);

    const loaded = loadSessionNotice({
      nowMs: 2000,
      ttlMs: 5 * 60 * 1000,
      storageOverride: storage
    });
    expect(loaded).toBeNull();
  });
});


