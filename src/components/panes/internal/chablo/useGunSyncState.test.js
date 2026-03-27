import {
  safeRecordReducer,
  safeScopedRecordReducer
} from './useGunSyncState';
import {
  createSafeDictionary
} from './chabloSafeStore';

describe('useGunSyncState reducers', () => {
  test('keeps sequential record updates instead of dropping earlier entries', () => {
    let state = createSafeDictionary();

    state = safeRecordReducer(state, {
      type: 'update',
      key: 'message-1',
      value: createSafeDictionary([['text', 'eerste']])
    });
    state = safeRecordReducer(state, {
      type: 'update',
      key: 'message-2',
      value: createSafeDictionary([['text', 'tweede']])
    });

    expect(state['message-1']).toEqual(createSafeDictionary([['text', 'eerste']]));
    expect(state['message-2']).toEqual(createSafeDictionary([['text', 'tweede']]));
  });

  test('handles scoped delete and update sequencing without losing sibling entries', () => {
    let state = createSafeDictionary();

    state = safeScopedRecordReducer(state, {
      type: 'sync-scopes',
      scopes: ['room-a']
    });
    state = safeScopedRecordReducer(state, {
      type: 'update',
      scopeKey: 'room-a',
      key: 'msg-1',
      value: createSafeDictionary([['text', 'eerste']])
    });
    state = safeScopedRecordReducer(state, {
      type: 'update',
      scopeKey: 'room-a',
      key: 'msg-2',
      value: createSafeDictionary([['text', 'tweede']])
    });
    state = safeScopedRecordReducer(state, {
      type: 'update',
      scopeKey: 'room-a',
      key: 'msg-1',
      value: null
    });

    expect(state['room-a']).toEqual(createSafeDictionary([
      ['msg-2', createSafeDictionary([['text', 'tweede']])]
    ]));
  });

  test('treats __proto__, constructor and prototype as plain data keys', () => {
    let recordState = createSafeDictionary();
    recordState = safeRecordReducer(recordState, {
      type: 'update',
      key: '__proto__',
      value: createSafeDictionary([['text', 'veilig']])
    });
    recordState = safeRecordReducer(recordState, {
      type: 'update',
      key: 'constructor',
      value: createSafeDictionary([['text', 'ook veilig']])
    });

    let scopedState = createSafeDictionary();
    scopedState = safeScopedRecordReducer(scopedState, {
      type: 'sync-scopes',
      scopes: ['prototype']
    });
    scopedState = safeScopedRecordReducer(scopedState, {
      type: 'update',
      scopeKey: 'prototype',
      key: '__proto__',
      value: createSafeDictionary([['text', 'nested veilig']])
    });

    expect(Object.getPrototypeOf(recordState)).toBe(null);
    expect(Object.getPrototypeOf(scopedState)).toBe(null);
    expect(recordState.__proto__).toEqual(createSafeDictionary([['text', 'veilig']]));
    expect(recordState.constructor).toEqual(createSafeDictionary([['text', 'ook veilig']]));
    expect(scopedState.prototype.__proto__).toEqual(createSafeDictionary([['text', 'nested veilig']]));
    expect({}.text).toBeUndefined();
  });
});
