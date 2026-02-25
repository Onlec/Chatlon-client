import React, { useEffect, useState, useCallback, useRef } from 'react';
import { gun } from '../../../gun';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// Board is opgeslagen als string van 9 tekens: '_' = leeg, 'X', 'O'
function parseBoardStr(str) {
  const s = typeof str === 'string' && str.length === 9 ? str : '_________';
  return Array.from(s).map((c) => (c === '_' ? null : c));
}

function serializeBoard(arr) {
  return arr.map((c) => c || '_').join('');
}

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw';
  return null;
}

function TicTacToe({ gameSessionId, currentUser, contactName }) {
  const [gameState, setGameState] = useState(null);
  const gameStateRef = useRef(null);
  const abandonTimerRef = useRef(null);

  useEffect(() => {
    // Cancel any abandon timer scheduled by a prior cleanup (e.g. React StrictMode)
    if (abandonTimerRef.current) {
      clearTimeout(abandonTimerRef.current);
      abandonTimerRef.current = null;
    }

    if (!gameSessionId) return;
    const node = gun.get(`GAME_STATE_${gameSessionId}`);
    const handler = node.on((data) => {
      if (!data || !data.player1) return;
      const parsed = {
        board: parseBoardStr(data.board),
        currentTurn: data.currentTurn,
        winner: data.winner || null,
        player1: data.player1,
        player2: data.player2,
        status: data.status,
        abandonedBy: data.abandonedBy || null,
      };
      gameStateRef.current = parsed;
      setGameState(parsed);
    });

    return () => {
      handler?.off?.();
      // Delay the abandon write so React StrictMode's cleanup+remount cycle can cancel it
      const gs = gameStateRef.current;
      if (gs && gs.status === 'active' && !gs.winner) {
        abandonTimerRef.current = setTimeout(() => {
          abandonTimerRef.current = null;
          gun.get(`GAME_STATE_${gameSessionId}`).put({
            status: 'abandoned',
            abandonedBy: currentUser,
          });
        }, 300);
      }
    };
  }, [gameSessionId, currentUser]);

  const handleCellClick = useCallback((index) => {
    if (!gameState) return;
    if (gameState.winner || gameState.status === 'finished') return;
    if (gameState.currentTurn !== currentUser) return;
    if (gameState.board[index] !== null) return;

    const mySymbol = gameState.player1 === currentUser ? 'X' : 'O';
    const newBoard = [...gameState.board];
    newBoard[index] = mySymbol;

    const winner = checkWinner(newBoard);
    const nextTurn = winner
      ? gameState.currentTurn
      : (currentUser === gameState.player1 ? gameState.player2 : gameState.player1);

    gun.get(`GAME_STATE_${gameSessionId}`).put({
      board: serializeBoard(newBoard),
      currentTurn: nextTurn,
      winner: winner || '',
      player1: gameState.player1,
      player2: gameState.player2,
      status: winner ? 'finished' : 'active'
    });
  }, [gameState, currentUser, gameSessionId]);

  if (!gameState) {
    return <div className="tictactoe-loading">Spelletje laden...</div>;
  }

  if (gameState.status === 'abandoned') {
    const abandonerName = gameState.abandonedBy === currentUser ? 'Jij' : contactName;
    return (
      <div className="tictactoe">
        <div className="tictactoe-abandoned">
          <span className="tictactoe-abandoned-icon">{'\u{1F6AA}'}</span>
          <span>{abandonerName === 'Jij' ? 'Je hebt het spel verlaten.' : `${contactName} heeft het spel verlaten.`}</span>
        </div>
      </div>
    );
  }

  const mySymbol = gameState.player1 === currentUser ? 'X' : 'O';
  const isMyTurn = gameState.currentTurn === currentUser;

  let statusText;
  if (gameState.winner === 'draw') {
    statusText = 'Gelijkspel!';
  } else if (gameState.winner) {
    statusText = gameState.winner === currentUser ? 'Jij wint!' : `${contactName} wint!`;
  } else if (isMyTurn) {
    statusText = `Jouw beurt (${mySymbol})`;
  } else {
    statusText = `Wachten op ${contactName}...`;
  }

  return (
    <div className="tictactoe">
      <div className="tictactoe-status">{statusText}</div>
      <div className="tictactoe-board">
        {gameState.board.map((cell, i) => (
          <button
            key={i}
            className={`tictactoe-cell ${cell ? `tictactoe-cell--${cell.toLowerCase()}` : ''}`}
            onClick={() => handleCellClick(i)}
            disabled={!!cell || !isMyTurn || !!gameState.winner}
          >
            {cell}
          </button>
        ))}
      </div>
      <div className="tictactoe-legend">
        <span>Jij: {mySymbol}</span>
        <span>{contactName}: {mySymbol === 'X' ? 'O' : 'X'}</span>
      </div>
    </div>
  );
}

export default TicTacToe;

