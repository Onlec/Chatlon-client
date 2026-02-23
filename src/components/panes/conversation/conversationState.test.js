import {
  createInitialConversationState,
  conversationReducer,
  normalizeIncomingMessage
} from './conversationState';

describe('conversationState', () => {
  test('createInitialConversationState returns empty state', () => {
    expect(createInitialConversationState()).toEqual({
      messages: [],
      messageMap: {}
    });
  });

  test('normalizeIncomingMessage returns null for invalid payloads', () => {
    expect(normalizeIncomingMessage(null, 'id-1')).toBeNull();
    expect(normalizeIncomingMessage({ sender: '' }, 'id-1')).toBeNull();
    expect(normalizeIncomingMessage({ sender: 'alice' }, '')).toBeNull();
    expect(normalizeIncomingMessage({ sender: 'alice' }, '_')).toBeNull();
    expect(normalizeIncomingMessage({ sender: 'alice' }, '#')).toBeNull();
  });

  test('normalizeIncomingMessage applies numeric timeRef fallback', () => {
    const result = normalizeIncomingMessage(
      { sender: 'alice', content: 'hello', timeRef: 'invalid' },
      'msg-1',
      { fallbackTimeRef: 1234 }
    );

    expect(result).toMatchObject({
      id: 'msg-1',
      sender: 'alice',
      content: 'hello',
      timeRef: 1234
    });
  });

  test('conversationReducer dedupes messages by id', () => {
    const state0 = createInitialConversationState();
    const state1 = conversationReducer(state0, {
      type: 'UPSERT_MESSAGE',
      payload: { id: 'm1', sender: 'alice', content: 'a', timeRef: 10 }
    });
    const state2 = conversationReducer(state1, {
      type: 'UPSERT_MESSAGE',
      payload: { id: 'm1', sender: 'alice', content: 'b', timeRef: 20 }
    });

    expect(state1.messages).toHaveLength(1);
    expect(state2.messages).toHaveLength(1);
    expect(state2.messages[0].content).toBe('a');
  });

  test('conversationReducer keeps stable sort by timeRef then id', () => {
    let state = createInitialConversationState();
    state = conversationReducer(state, {
      type: 'UPSERT_MESSAGE',
      payload: { id: 'b', sender: 'alice', content: 'b', timeRef: 100 }
    });
    state = conversationReducer(state, {
      type: 'UPSERT_MESSAGE',
      payload: { id: 'a', sender: 'alice', content: 'a', timeRef: 100 }
    });
    state = conversationReducer(state, {
      type: 'UPSERT_MESSAGE',
      payload: { id: 'c', sender: 'alice', content: 'c', timeRef: 50 }
    });

    expect(state.messages.map((message) => message.id)).toEqual(['c', 'a', 'b']);
  });

  test('conversationReducer reset clears message state', () => {
    const stateWithMessage = conversationReducer(createInitialConversationState(), {
      type: 'UPSERT_MESSAGE',
      payload: { id: 'm1', sender: 'alice', content: 'a', timeRef: 1 }
    });
    const resetState = conversationReducer(stateWithMessage, { type: 'RESET' });

    expect(resetState).toEqual(createInitialConversationState());
  });
});
