import { act, renderHook } from '@testing-library/react';
import { useChabloPresenceSync } from './useChabloPresenceSync';
import { createGunApiTreeMock } from './chabloTestUtils';

describe('useChabloPresenceSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('syncs position and hotspot presence and clears stale room presence on room change and unmount', () => {
    const { gunApi, getNode } = createGunApiTreeMock();
    const { rerender, unmount } = renderHook(
      ({ activeHotspot, currentRoom, position }) => useChabloPresenceSync({
        activeHotspot,
        currentRoom,
        currentUser: 'alice',
        gunApi,
        heartbeatMs: 1000,
        position
      }),
      {
        initialProps: {
          activeHotspot: { id: 'desk', label: 'Balie' },
          currentRoom: 'receptie',
          position: { x: 4, y: 6 }
        }
      }
    );

    const positionNode = getNode('CHABLO_POSITION', 'alice');
    const receptieHotspotNode = getNode('CHABLO_HOTSPOT_PRESENCE', 'receptie', 'alice');

    expect(positionNode.put).toHaveBeenCalledWith(expect.objectContaining({
      room: 'receptie',
      x: 4,
      y: 6
    }));
    expect(receptieHotspotNode.put).toHaveBeenCalledWith(expect.objectContaining({
      hotspotId: 'desk',
      hotspotLabel: 'Balie'
    }));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(positionNode.put).toHaveBeenCalledTimes(2);
    expect(receptieHotspotNode.put).toHaveBeenCalledTimes(2);

    rerender({
      activeHotspot: { id: 'bar-counter', label: 'Bartoog' },
      currentRoom: 'bar',
      position: { x: 2, y: 3 }
    });

    const barHotspotNode = getNode('CHABLO_HOTSPOT_PRESENCE', 'bar', 'alice');
    expect(receptieHotspotNode.put).toHaveBeenCalledWith(null);
    expect(barHotspotNode.put).toHaveBeenCalledWith(expect.objectContaining({
      hotspotId: 'bar-counter',
      hotspotLabel: 'Bartoog'
    }));

    unmount();

    expect(positionNode.put).toHaveBeenLastCalledWith(expect.objectContaining({
      room: 'bar',
      x: 2,
      y: 3,
      lastSeen: 0
    }));
    expect(barHotspotNode.put).toHaveBeenLastCalledWith(null);
  });
});
