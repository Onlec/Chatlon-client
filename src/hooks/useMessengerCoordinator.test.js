import React from 'react';
import { act, render } from '@testing-library/react';
import { useMessengerCoordinator } from './useMessengerCoordinator';

let latestCoordinator = null;

function Harness(props) {
  latestCoordinator = useMessengerCoordinator(props);
  return null;
}

function createBaseProps(overrides = {}) {
  return {
    currentUser: 'alice@example.com',
    messengerSignedInRef: { current: true },
    settings: { toastNotifications: true },
    activePaneRef: { current: null },
    conversationsRef: { current: {} },
    setUnreadChats: jest.fn(),
    showToast: jest.fn(),
    getAvatar: (name) => `/avatar/${name}.png`,
    getDisplayNameRef: { current: (name) => name },
    playSound: jest.fn(),
    openPane: jest.fn(),
    onTaskbarClick: jest.fn(),
    ...overrides
  };
}

describe('useMessengerCoordinator', () => {
  test('incoming message while conversation closed sets unread + toast and does not auto-open', () => {
    const setUnreadChats = jest.fn((updater) => updater(new Set()));
    const showToast = jest.fn();
    const onTaskbarClick = jest.fn();
    const openPane = jest.fn();

    render(
      <Harness
        {...createBaseProps({ setUnreadChats, showToast, onTaskbarClick, openPane })}
      />
    );

    act(() => {
      latestCoordinator.handleIncomingMessage(
        { sender: 'bob@example.com', content: 'hello', type: 'message' },
        'bob@example.com',
        'm1',
        'CHAT_alice_bob_1'
      );
    });

    expect(setUnreadChats).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'message',
      contactName: 'bob@example.com',
      messageId: 'm1'
    }));
    expect(onTaskbarClick).not.toHaveBeenCalled();
    expect(openPane).not.toHaveBeenCalled();
  });

  test('incoming nudge uses nudge toast path and does not emit message toast', () => {
    const showToast = jest.fn();
    const playSound = jest.fn();

    render(
      <Harness
        {...createBaseProps({ showToast, playSound })}
      />
    );

    act(() => {
      latestCoordinator.handleIncomingMessage(
        { sender: 'bob@example.com', content: 'n', type: 'nudge' },
        'bob@example.com',
        'n1',
        'CHAT_alice_bob_1'
      );
    });

    expect(playSound).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'nudge',
      contactName: 'bob@example.com'
    }));
  });

  test('presence online toast respects toastNotifications setting', () => {
    const showToast = jest.fn();
    const { rerender } = render(
      <Harness
        {...createBaseProps({ showToast, settings: { toastNotifications: true } })}
      />
    );

    act(() => {
      latestCoordinator.handleContactOnline('bob@example.com');
    });
    expect(showToast).toHaveBeenCalledTimes(1);

    rerender(
      <Harness
        {...createBaseProps({ showToast, settings: { toastNotifications: false } })}
      />
    );

    act(() => {
      latestCoordinator.handleContactOnline('bob@example.com');
    });
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  test('toast click routes conversation and friend request correctly', () => {
    const onTaskbarClick = jest.fn();
    const openPane = jest.fn();

    render(
      <Harness
        {...createBaseProps({ onTaskbarClick, openPane })}
      />
    );

    act(() => {
      latestCoordinator.handleToastClick({ type: 'message', contactName: 'bob@example.com' });
      latestCoordinator.handleToastClick({ type: 'presence', contactName: 'carol@example.com' });
      latestCoordinator.handleToastClick({ type: 'nudge', contactName: 'dave@example.com' });
      latestCoordinator.handleToastClick({ type: 'friendRequest', contactName: 'bob@example.com' });
    });

    expect(onTaskbarClick).toHaveBeenCalledWith('conv_bob@example.com');
    expect(onTaskbarClick).toHaveBeenCalledWith('conv_carol@example.com');
    expect(onTaskbarClick).toHaveBeenCalledWith('conv_dave@example.com');
    expect(openPane).toHaveBeenCalledWith('contacts');
  });

  test('keeps handler identity stable while using latest settings/runtime refs', () => {
    const messengerSignedInRef = { current: true };
    const activePaneRef = { current: null };
    const conversationsRef = { current: {} };
    const getDisplayNameRef = { current: (name) => name };
    const setUnreadChats = jest.fn();

    const showToastA = jest.fn();
    const showToastB = jest.fn();
    const playSoundA = jest.fn();
    const playSoundB = jest.fn();

    const propsA = createBaseProps({
      messengerSignedInRef,
      activePaneRef,
      conversationsRef,
      getDisplayNameRef,
      setUnreadChats,
      showToast: showToastA,
      playSound: playSoundA,
      settings: { toastNotifications: true }
    });

    const { rerender } = render(<Harness {...propsA} />);
    const firstIncomingHandler = latestCoordinator.handleIncomingMessage;

    const propsB = {
      ...propsA,
      settings: { toastNotifications: false },
      showToast: showToastB,
      playSound: playSoundB
    };
    rerender(<Harness {...propsB} />);

    expect(latestCoordinator.handleIncomingMessage).toBe(firstIncomingHandler);

    act(() => {
      latestCoordinator.handleIncomingMessage(
        { sender: 'bob@example.com', content: 'hello', type: 'message' },
        'bob@example.com',
        'msg-1',
        'CHAT_alice_bob_1'
      );
    });

    expect(playSoundA).not.toHaveBeenCalled();
    expect(playSoundB).toHaveBeenCalledTimes(1);
    expect(showToastA).not.toHaveBeenCalled();
    expect(showToastB).not.toHaveBeenCalled();
  });
});
