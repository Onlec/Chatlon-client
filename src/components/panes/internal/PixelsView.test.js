import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PixelsView from './PixelsView';

jest.mock('../../../gun', () => ({
  gun: {
    get: jest.fn(() => undefined)
  }
}));

function createGunApiMock(initialBlocks = {}) {
  const listeners = [];
  const blockNodes = new Map();
  const store = { ...initialBlocks };

  const mapNode = {
    on: jest.fn((callback) => {
      listeners.push(callback);
      Object.entries(store).forEach(([blockId, data]) => callback(data, blockId));
    }),
    off: jest.fn()
  };

  const rootNode = {
    get: jest.fn((blockId) => {
      if (!blockNodes.has(blockId)) {
        blockNodes.set(blockId, { put: jest.fn() });
      }
      return blockNodes.get(blockId);
    }),
    map: jest.fn(() => mapNode),
    off: jest.fn()
  };

  return {
    gunApi: {
      get: jest.fn((key) => (key === 'PIXELS_GRID' ? rootNode : rootNode))
    },
    emitBlock(blockId, data) {
      if (data) {
        store[blockId] = data;
      } else {
        delete store[blockId];
      }
      listeners.forEach((listener) => listener(data, blockId));
    },
    getBlockNode(blockId) {
      return rootNode.get(blockId);
    }
  };
}

describe('PixelsView', () => {
  let getContextSpy;

  beforeAll(() => {
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      strokeRect: jest.fn()
    }));
  });

  afterAll(() => {
    getContextSpy.mockRestore();
  });

  function selectCanvasBlock(blockX, blockY) {
    const canvas = screen.getByLabelText('Pixels chatlon canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 720,
      height: 720,
      right: 720,
      bottom: 720
    });

    fireEvent.click(canvas, {
      clientX: (blockX / 1000) * 720 + 2,
      clientY: (blockY / 1000) * 720 + 2
    });
  }

  test('shows a tooltip for claimed blocks on hover', async () => {
    const api = createGunApiMock({
      '20_30': {
        owner: 'alice',
        color: '#ff0000',
        label: 'Retro spot',
        url: 'https://example.com/'
      }
    });

    render(<PixelsView currentUser="alice" gunApi={api.gunApi} />);

    const canvas = screen.getByLabelText('Pixels chatlon canvas');
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 720,
      height: 720,
      right: 720,
      bottom: 720
    });

    fireEvent.mouseMove(canvas, {
      clientX: (20 / 1000) * 720 + 2,
      clientY: (30 / 1000) * 720 + 2
    });

    await screen.findByText('Retro spot');
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  test('claims an empty block and writes the payload to Gun', async () => {
    const api = createGunApiMock();

    render(<PixelsView currentUser="alice" gunApi={api.gunApi} />);

    selectCanvasBlock(50, 60);

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Mijn hoek' } });
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Claim dit blok' }));

    await waitFor(() => {
      expect(api.getBlockNode('50_60').put).toHaveBeenCalledWith(expect.objectContaining({
        owner: 'alice',
        color: expect.any(String),
        label: 'Mijn hoek',
        url: 'https://example.com'
      }));
    });
  });

  test('does not allow claiming an occupied block', async () => {
    const api = createGunApiMock({
      '70_80': {
        owner: 'bob',
        color: '#00aa00',
        label: 'Bezet',
        url: ''
      }
    });

    render(<PixelsView currentUser="alice" gunApi={api.gunApi} />);

    selectCanvasBlock(70, 80);

    expect(await screen.findByText(/Eigenaar:/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim dit blok' })).toBeNull();
  });

  test('enforces one claim per user in the first version', async () => {
    const api = createGunApiMock({
      '10_10': {
        owner: 'alice',
        color: '#223344',
        label: 'Mijn blok',
        url: ''
      }
    });

    render(<PixelsView currentUser="alice" gunApi={api.gunApi} />);

    selectCanvasBlock(20, 20);

    await screen.findByText(/Je hebt al een blok geclaimd op 10, 10/i);
    expect(screen.getByRole('button', { name: 'Claim dit blok' })).toBeDisabled();
  });
});
