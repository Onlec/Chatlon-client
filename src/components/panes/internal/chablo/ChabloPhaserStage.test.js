import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ChabloPhaserStage from './ChabloPhaserStage';

const mockBridge = {
  updateWorld: jest.fn(),
  resize: jest.fn(),
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
});
