import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ChabloPhaserStage, { getStagePayload, handleStageWheelZoom } from './ChabloPhaserStage';

const mockBridge = {
  updateWorld: jest.fn(),
  resize: jest.fn(),
  adjustZoom: jest.fn(),
  destroy: jest.fn()
};

jest.mock('./createChabloPhaserBridge', () => ({
  createChabloPhaserBridge: jest.fn(() => mockBridge)
}));

jest.mock('phaser', () => ({
  __esModule: true,
  default: {
    AUTO: 'AUTO',
    Scale: {
      RESIZE: 'RESIZE',
      CENTER_BOTH: 'CENTER_BOTH'
    },
    Geom: {
      Rectangle: class Rectangle {}
    }
  },
  AUTO: 'AUTO',
  Scale: {
    RESIZE: 'RESIZE',
    CENTER_BOTH: 'CENTER_BOTH'
  },
  Geom: {
    Rectangle: class Rectangle {}
  }
}), { virtual: true });

describe('ChabloPhaserStage', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    mockBridge.updateWorld.mockClear();
    mockBridge.resize.mockClear();
    mockBridge.adjustZoom.mockClear();
    mockBridge.destroy.mockClear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('starts movement once per key press and stops on keyup and blur', async () => {
    const onDirectionStart = jest.fn();
    const onDirectionStop = jest.fn();

    render(
      <ChabloPhaserStage
        currentRoomMeta={{ id: 'receptie', name: 'Receptie', accent: '#f0c97c' }}
        currentUser="alice"
        onDirectionStart={onDirectionStart}
        onDirectionStop={onDirectionStop}
        onTileActivate={jest.fn()}
        onSelectAvatar={jest.fn()}
        otherOccupants={[]}
        position={{ x: 4, y: 3 }}
        selectedAvatar={null}
      />
    );

    const stage = screen.getByRole('application', { name: 'Chablo Motel kamer Receptie' });
    fireEvent.keyDown(stage, { key: 'ArrowRight', repeat: false });
    fireEvent.keyDown(stage, { key: 'ArrowRight', repeat: true });
    fireEvent.keyDown(stage, { key: 'ArrowDown', repeat: false });

    expect(onDirectionStart).toHaveBeenNthCalledWith(1, 1, 0);
    expect(onDirectionStart).toHaveBeenNthCalledWith(2, 0, 1);
    expect(onDirectionStart).toHaveBeenCalledTimes(2);

    fireEvent.keyUp(stage, { key: 'ArrowRight' });
    expect(onDirectionStop).not.toHaveBeenCalled();

    fireEvent.keyUp(stage, { key: 'ArrowDown' });
    expect(onDirectionStop).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(stage, { key: 'ArrowLeft', repeat: false });
    fireEvent.blur(stage);
    expect(onDirectionStop).toHaveBeenCalledTimes(2);
  });

  test('zooms the stage camera with the mouse wheel', () => {
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const focus = jest.fn();

    handleStageWheelZoom({
      deltaY: -120,
      preventDefault,
      stopPropagation,
      currentTarget: { focus }
    }, mockBridge);

    handleStageWheelZoom({
      deltaY: 140,
      preventDefault,
      stopPropagation,
      currentTarget: { focus }
    }, mockBridge);

    expect(mockBridge.adjustZoom).toHaveBeenNthCalledWith(1, -120);
    expect(mockBridge.adjustZoom).toHaveBeenNthCalledWith(2, 140);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(stopPropagation).toHaveBeenCalledTimes(2);
    expect(focus).toHaveBeenCalledTimes(2);
  });

  test('includes shared room state in the stage world payload', () => {
    const roomStateByHotspotId = {
      Balie: {
        hotspotId: 'Balie',
        title: 'Receptie live',
        text: 'alice checkt in bij de balie.',
        updatedAt: 1234
      }
    };
    const activeEmotesByUsername = {
      alice: {
        type: 'wave',
        label: 'WAVE',
        by: 'alice',
        roomId: 'receptie',
        issuedAt: 1234,
        expiresAt: 3600
      }
    };
    const appearanceByUsername = {
      alice: {
        bodyShape: 'triangle',
        skinTone: 'sand'
      }
    };

    expect(getStagePayload({
      activeHotspotId: 'Balie',
      activeEmotesByUsername,
      appearanceByUsername,
      currentRoomMeta: { id: 'receptie', name: 'Receptie', accent: '#f0c97c' },
      currentUser: 'alice',
      onDirectionStart: jest.fn(),
      onDirectionStop: jest.fn(),
      onTileActivate: jest.fn(),
      onSelectAvatar: jest.fn(),
      otherOccupants: [],
      position: { x: 4, y: 3 },
      roomStateByHotspotId,
      selectedAvatar: null
    })).toEqual(expect.objectContaining({
      activeHotspotId: 'Balie',
      activeEmotesByUsername,
      appearanceByUsername,
      roomStateByHotspotId
    }));
  });

  test('notifies the parent when the engine state changes', async () => {
    const onEngineStateChange = jest.fn();

    render(
      <ChabloPhaserStage
        currentRoomMeta={{ id: 'receptie', name: 'Receptie', accent: '#f0c97c' }}
        currentUser="alice"
        onDirectionStart={jest.fn()}
        onDirectionStop={jest.fn()}
        onEngineStateChange={onEngineStateChange}
        onTileActivate={jest.fn()}
        onSelectAvatar={jest.fn()}
        otherOccupants={[]}
        position={{ x: 4, y: 3 }}
        roomStateByHotspotId={{}}
        selectedAvatar={null}
      />
    );

    expect(onEngineStateChange).toHaveBeenCalledWith('loading');
  });
});
