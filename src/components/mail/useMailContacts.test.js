import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useMailContacts } from './useMailContacts';

jest.mock('../../gun', () => {
  const nodeStore = new Map();

  function createNode(path) {
    const mapListeners = [];

    return {
      path,
      get: jest.fn((child) => getNode(`${path}/${child}`)),
      map: jest.fn(() => ({
        on: jest.fn((callback) => {
          mapListeners.push(callback);
        }),
        off: jest.fn(() => {
          mapListeners.length = 0;
        })
      })),
      off: jest.fn(() => {
        mapListeners.length = 0;
      }),
      __emitMap(value, key) {
        mapListeners.slice().forEach((callback) => callback(value, key));
      }
    };
  }

  function getNode(path) {
    if (!nodeStore.has(path)) {
      nodeStore.set(path, createNode(path));
    }
    return nodeStore.get(path);
  }

  return {
    user: {
      is: { alias: 'alice@example.com' },
      get: jest.fn((key) => getNode(`user/${key}`))
    },
    __mockGetNode: getNode,
    __mockNodeStore: nodeStore
  };
});

const { user, __mockGetNode: getNode, __mockNodeStore: nodeStore } = require('../../gun');

let latest = [];

function Harness({ currentUser }) {
  latest = useMailContacts(currentUser);
  return null;
}

describe('useMailContacts', () => {
  beforeEach(() => {
    nodeStore.clear();
    user.get.mockImplementation((key) => getNode(`user/${key}`));
    latest = [];
  });

  test('returns only accepted contacts, including offline ones, and excludes pending or blocked entries', async () => {
    render(<Harness currentUser="alice@example.com" />);

    act(() => {
      getNode('user/contacts').__emitMap({
        username: 'accepted-offline@example.com',
        status: 'accepted',
        lastSeen: 0
      }, 'accepted-offline@example.com');
      getNode('user/contacts').__emitMap({
        username: 'pending@example.com',
        status: 'pending'
      }, 'pending@example.com');
      getNode('user/contacts').__emitMap({
        username: 'blocked@example.com',
        status: 'blocked'
      }, 'blocked@example.com');
    });

    await waitFor(() => {
      expect(latest).toEqual(['accepted-offline@example.com']);
    });
  });
});
