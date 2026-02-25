import React from 'react';
import TicTacToe from './games/TicTacToe';

function GamePane({ contactName, gameSessionId, gameType, currentUser }) {
  return (
    <div className="game-pane">
      {gameType === 'tictactoe' && (
        <TicTacToe
          gameSessionId={gameSessionId}
          currentUser={currentUser}
          contactName={contactName}
        />
      )}
    </div>
  );
}

export default GamePane;
