import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { GameBoardScreen } from './components/GameBoardScreen';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { useGameSocket } from './hooks/useGameSocket';

export const App: React.FC = () => {
  const {
    nickname,
    invitedRoomCode,
    roomState,
    isConnected,
    isLoading,
    errorMessage,
    clearError,
    createRoom,
    joinRoom,
    switchTeam,
    shuffleTeams,
    startGame,
    sendClue,
    pointCard,
    revealCard,
    passTurn,
    nextMatch,
    backToLobby,
    leaveRoom,
  } = useGameSocket();

  return (
    <div className="relative min-h-[100dvh] text-slate-100">
      {/* Toast Flutuante de Alerta / Erro Operacional */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-rose-950/95 border-2 border-rose-500 text-rose-100 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="p-1 rounded-lg hover:bg-rose-900/60 text-rose-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!roomState ? (
        <HomeScreen
          initialNickname={nickname}
          invitedRoomCode={invitedRoomCode}
          isConnected={isConnected}
          isLoading={isLoading}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
        />
      ) : roomState.fase === 'LOBBY' ? (
        <LobbyScreen
          roomState={roomState}
          onSwitchTeam={switchTeam}
          onShuffleTeams={shuffleTeams}
          onStartGame={startGame}
          onLeaveRoom={leaveRoom}
        />
      ) : (
        <GameBoardScreen
          roomState={roomState}
          onSendClue={sendClue}
          onPointCard={pointCard}
          onRevealCard={revealCard}
          onPassTurn={passTurn}
          onNextMatch={nextMatch}
          onBackToLobby={backToLobby}
          onLeaveRoom={leaveRoom}
        />
      )}
    </div>
  );
};

export default App;
