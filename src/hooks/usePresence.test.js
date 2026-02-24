import React from 'react';
import { act, render } from '@testing-library/react';
import { usePresence } from './usePresence';
import { PRESENCE_HEARTBEAT_INTERVAL } from '../utils/presenceUtils';

jest.mock('../gun', () => {
  const nodeStore = new Map();

  function createNode(path) {
    return {
      path,
      get: jest.fn((child) => getNode(`${path}/${child}`)),
      put: jest.fn()
    };
  }

  function getNode(path) {
    if (!nodeStore.has(path)) {
      nodeStore.set(path, createNode(path));
    }
    return nodeStore.get(path);
  }

  const user = { is: { alias: 'alice@example.com' } };

  return {
    gun: {
      get: jest.fn((key) => getNode(key))
    },
    user,
    __mockGetNode: getNode,
    __mockNodeStore: nodeStore
  };
});

const { gun, user, __mockGetNode: getNode, __mockNodeStore: nodeStore } = require('../gun');

let latest = null;

function Harness(props) {
  latest = usePresence(props.isLoggedIn, props.currentUser, props.isActive);
  return null;
}

describe('usePresence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    nodeStore.clear();
    gun.get.mockImplementation((key) => getNode(key));
    user.is = { alias: 'alice@example.com' };
    latest = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not start heartbeat writes when messenger is not active', () => {
    render(<Harness isLoggedIn currentUser="alice@example.com" isActive={false} />);
    const node = getNode('PRESENCE/alice@example.com');
    expect(node.put).toHaveBeenCalledTimes(1);
    expect(node.put.mock.calls[0][0]).toEqual(expect.objectContaining({
      status: 'offline',
      source: 'messenger'
    }));

    act(() => {
      jest.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL * 2);
    });
    expect(node.put).toHaveBeenCalledTimes(1);
  });

  test('heartbeat writes include additive fields and monotonic heartbeatSeq', () => {
    render(<Harness isLoggedIn currentUser="alice@example.com" isActive />);
    const node = getNode('PRESENCE/alice@example.com');

    expect(node.put).toHaveBeenCalled();
    const first = node.put.mock.calls[0][0];
    expect(first).toEqual(expect.objectContaining({
      status: 'online',
      username: 'alice@example.com',
      source: 'messenger'
    }));
    expect(typeof first.heartbeatAt).toBe('number');
    expect(first.heartbeatSeq).toBeGreaterThanOrEqual(1);
    expect(typeof first.sessionId).toBe('string');
    expect(typeof first.tabId).toBe('string');

    act(() => {
      jest.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL + 5);
    });

    const second = node.put.mock.calls[node.put.mock.calls.length - 1][0];
    expect(second.heartbeatSeq).toBeGreaterThan(first.heartbeatSeq);
  });

  test('cleanup is idempotent and keeps writing offline contract', () => {
    render(<Harness isLoggedIn currentUser="alice@example.com" isActive />);
    const node = getNode('PRESENCE/alice@example.com');
    const before = node.put.mock.calls.length;

    act(() => {
      latest.cleanup();
      latest.cleanup();
    });

    expect(node.put.mock.calls.length).toBe(before + 2);
    const last = node.put.mock.calls[node.put.mock.calls.length - 1][0];
    expect(last).toEqual(expect.objectContaining({
      status: 'offline',
      source: 'messenger'
    }));
  });
});

