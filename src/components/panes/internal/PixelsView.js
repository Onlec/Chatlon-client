import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gun } from '../../../gun';

const BOARD_SIZE = 1000;
const BLOCK_SIZE = 10;
const DEFAULT_COLOR = '#ff3366';
const GRID_NODE = 'PIXELS_GRID';

function toBlockId(x, y) {
  return `${x}_${y}`;
}

function clampPixel(value) {
  return Math.max(0, Math.min(BOARD_SIZE - 1, value));
}

function readCanvasContext(canvas) {
  if (!canvas) return null;

  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

function normalizeClaimUrl(urlValue) {
  const trimmed = (urlValue || '').trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function drawPixelBoard(ctx, grid, selectedBlockId) {
  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  ctx.strokeStyle = '#eceff3';
  ctx.lineWidth = 1;
  for (let offset = 0; offset <= BOARD_SIZE; offset += BLOCK_SIZE) {
    ctx.beginPath();
    ctx.moveTo(offset + 0.5, 0);
    ctx.lineTo(offset + 0.5, BOARD_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, offset + 0.5);
    ctx.lineTo(BOARD_SIZE, offset + 0.5);
    ctx.stroke();
  }

  Object.entries(grid).forEach(([blockId, data]) => {
    if (!data?.owner) return;
    const [x, y] = blockId.split('_').map(Number);
    ctx.fillStyle = data.color || '#7d8ba0';
    ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  });

  if (selectedBlockId) {
    const [x, y] = selectedBlockId.split('_').map(Number);
    ctx.strokeStyle = '#14253c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
  }
}

function buildTooltip(block, siteRect, event) {
  return {
    left: Math.max(8, event.clientX - siteRect.left + 16),
    top: Math.max(8, event.clientY - siteRect.top + 16),
    block
  };
}

function getBlockCoordinatesFromEvent(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = clampPixel(Math.floor(((event.clientX - rect.left) / Math.max(rect.width, 1)) * BOARD_SIZE));
  const y = clampPixel(Math.floor(((event.clientY - rect.top) / Math.max(rect.height, 1)) * BOARD_SIZE));
  const blockX = Math.floor(x / BLOCK_SIZE) * BLOCK_SIZE;
  const blockY = Math.floor(y / BLOCK_SIZE) * BLOCK_SIZE;

  return {
    x: blockX,
    y: blockY,
    blockId: toBlockId(blockX, blockY)
  };
}

function EmptySelectionState() {
  return (
    <>
      <h3>Claim een blok</h3>
      <p>Klik op een leeg 10x10 blok om een kleur, label en optionele link vast te leggen.</p>
    </>
  );
}

function PlaceholderSelectionState({ title, description }) {
  return (
    <div className="browser-internal-placeholder">
      <div className="browser-internal-placeholder__eyebrow">Binnenkort</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function PixelsView({ currentUser = 'guest', gunApi = gun }) {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const [grid, setGrid] = useState({});
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [claimColor, setClaimColor] = useState(DEFAULT_COLOR);
  const [claimLabel, setClaimLabel] = useState('');
  const [claimUrl, setClaimUrl] = useState('');
  const [claimError, setClaimError] = useState('');

  useEffect(() => {
    const pixelsGridNode = gunApi?.get?.(GRID_NODE);
    if (!pixelsGridNode || typeof pixelsGridNode.map !== 'function') {
      return undefined;
    }
    const mappedNode = pixelsGridNode.map();

    const handleBlock = (data, blockId) => {
      if (!/^\d+_\d+$/.test(blockId || '')) return;

      setGrid((previousGrid) => {
        if (!data || !data.owner) {
          if (!(blockId in previousGrid)) return previousGrid;
          const nextGrid = { ...previousGrid };
          delete nextGrid[blockId];
          return nextGrid;
        }

        const nextBlock = {
          owner: data.owner,
          color: data.color || DEFAULT_COLOR,
          label: data.label || '',
          url: data.url || '',
          claimedAt: data.claimedAt || null
        };
        const previousBlock = previousGrid[blockId];

        if (
          previousBlock
          && previousBlock.owner === nextBlock.owner
          && previousBlock.color === nextBlock.color
          && previousBlock.label === nextBlock.label
          && previousBlock.url === nextBlock.url
          && previousBlock.claimedAt === nextBlock.claimedAt
        ) {
          return previousGrid;
        }

        return {
          ...previousGrid,
          [blockId]: nextBlock
        };
      });
    };

    mappedNode.on(handleBlock);

    return () => {
      if (typeof mappedNode.off === 'function') {
        mappedNode.off();
      } else if (typeof pixelsGridNode.off === 'function') {
        pixelsGridNode.off();
      }
    };
  }, [gunApi]);

  useEffect(() => {
    const ctx = readCanvasContext(canvasRef.current);
    if (!ctx) return;
    drawPixelBoard(ctx, grid, selectedBlockId);
  }, [grid, selectedBlockId]);

  const userClaim = useMemo(() => (
    Object.entries(grid).find(([, block]) => block?.owner === currentUser) || null
  ), [currentUser, grid]);

  const selectedBlock = selectedBlockId ? grid[selectedBlockId] || null : null;
  const totalClaimedBlocks = useMemo(() => Object.keys(grid).length, [grid]);
  const canClaimSelectedBlock = Boolean(
    selectedBlockId
    && !selectedBlock
    && (!userClaim || userClaim[0] === selectedBlockId)
  );

  const handleCanvasClick = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { blockId } = getBlockCoordinatesFromEvent(canvas, event);
    setSelectedBlockId(blockId);
    setClaimError('');
  }, []);

  const handleCanvasMove = useCallback((event) => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const { blockId } = getBlockCoordinatesFromEvent(canvas, event);
    const block = grid[blockId];

    if (!block) {
      setTooltip(null);
      return;
    }

    setTooltip(buildTooltip(block, viewport.getBoundingClientRect(), event));
  }, [grid]);

  const handleCanvasLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleClaimSubmit = useCallback((event) => {
    event.preventDefault();

    if (!selectedBlockId) {
      setClaimError('Selecteer eerst een blok.');
      return;
    }

    if (grid[selectedBlockId]) {
      setClaimError('Dit blok is al geclaimd.');
      return;
    }

    if (userClaim && userClaim[0] !== selectedBlockId) {
      setClaimError('Je kunt in deze eerste versie maar een blok claimen.');
      return;
    }

    const payload = {
      owner: currentUser,
      color: claimColor || DEFAULT_COLOR,
      label: claimLabel.trim(),
      url: normalizeClaimUrl(claimUrl),
      claimedAt: Date.now()
    };

    const blockNode = gunApi?.get?.(GRID_NODE)?.get?.(selectedBlockId);
    if (!blockNode || typeof blockNode.put !== 'function') {
      setClaimError('De pixelmuur is tijdelijk niet beschikbaar.');
      return;
    }

    blockNode.put(payload);
    setClaimError('');
  }, [claimColor, claimLabel, claimUrl, currentUser, grid, gunApi, selectedBlockId, userClaim]);

  return (
    <div className="pixels-page">
      <div className="pixels-layout">
        <div className="pixels-board-shell">
          <div className="pixels-header">
            <div>
              <h2>Pixels.chatlon</h2>
              <p>Een lokale pixelmuur van 100 x 100 claimbare blokken.</p>
            </div>
            <div className="pixels-stats">
              <strong>{totalClaimedBlocks}</strong>
              <span>van 10.000 blokken geclaimd</span>
            </div>
          </div>

          <div className="pixels-board-viewport" ref={viewportRef}>
            <div className="pixels-board-stage">
              <canvas
                ref={canvasRef}
                className="pixels-board-canvas"
                width={BOARD_SIZE}
                height={BOARD_SIZE}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMove}
                onMouseLeave={handleCanvasLeave}
                aria-label="Pixels chatlon canvas"
              />
            </div>

            {tooltip && (
              <div
                className="pixels-tooltip"
                style={{ left: tooltip.left, top: tooltip.top }}
                role="note"
              >
                <strong>{tooltip.block.label || tooltip.block.owner}</strong>
                <span>{tooltip.block.owner}</span>
                {tooltip.block.url && <span>{tooltip.block.url}</span>}
              </div>
            )}
          </div>
        </div>

        <aside className="pixels-sidebar">
          {selectedBlockId ? (
            <>
              <h3>Blok {selectedBlockId.replace('_', ', ')}</h3>
              {selectedBlock ? (
                <div className="pixels-owned-card">
                  <p><strong>Eigenaar:</strong> {selectedBlock.owner}</p>
                  <p><strong>Kleur:</strong> {selectedBlock.color}</p>
                  {selectedBlock.label && <p><strong>Label:</strong> {selectedBlock.label}</p>}
                  {selectedBlock.url && (
                    <p>
                      <strong>Link:</strong>{' '}
                      <a href={selectedBlock.url} target="_blank" rel="noreferrer">
                        {selectedBlock.url}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <form className="pixels-claim-form" onSubmit={handleClaimSubmit}>
                  <label className="pixels-field">
                    <span>Kleur</span>
                    <input
                      type="color"
                      value={claimColor}
                      onChange={(event) => setClaimColor(event.target.value)}
                    />
                  </label>

                  <label className="pixels-field">
                    <span>Label</span>
                    <input
                      type="text"
                      value={claimLabel}
                      onChange={(event) => setClaimLabel(event.target.value)}
                      maxLength={40}
                      placeholder="Mijn retro hoekje"
                    />
                  </label>

                  <label className="pixels-field">
                    <span>Link</span>
                    <input
                      type="text"
                      value={claimUrl}
                      onChange={(event) => setClaimUrl(event.target.value)}
                      placeholder="voorbeeld.be"
                    />
                  </label>

                  {userClaim && userClaim[0] !== selectedBlockId && (
                    <div className="pixels-inline-warning">
                      Je hebt al een blok geclaimd op {userClaim[0].replace('_', ', ')}.
                    </div>
                  )}

                  {claimError && (
                    <div className="pixels-inline-error">{claimError}</div>
                  )}

                  <button type="submit" className="yoctol-btn" disabled={!canClaimSelectedBlock}>
                    Claim dit blok
                  </button>
                </form>
              )}
            </>
          ) : (
            <EmptySelectionState />
          )}
        </aside>
      </div>
    </div>
  );
}

export function InternalSitePlaceholder({ title, description }) {
  return <PlaceholderSelectionState title={title} description={description} />;
}

export default PixelsView;
