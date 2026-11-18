import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  RoomStateDTO,
  ServerToClientEvents,
} from '../../../shared/types';

const STORAGE_KEYS = {
  PLAYER_ID: 'cipher_grid_player_id',
  NICKNAME: 'cipher_grid_nickname',
  ROOM_CODE: 'cipher_grid_room_code',
};

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreatePlayerId(): string {
  const existing = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
  if (existing && existing.length > 8) {
    return existing;
  }
  const newId = generateUUID();
  localStorage.setItem(STORAGE_KEYS.PLAYER_ID, newId);
  return newId;
}

function getRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('room') || params.get('sala');
  if (!raw) return null;
  const clean = raw.trim().toUpperCase().slice(0, 4);
  return clean.length === 4 ? clean : null;
}

function updateUrlRoomParam(roomCode: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (roomCode) {
    url.searchParams.set('room', roomCode.toUpperCase());
    url.searchParams.delete('sala');
  } else {
    url.searchParams.delete('room');
    url.searchParams.delete('sala');
  }
  window.history.replaceState({}, '', url.toString());
}

// Mantém uma instância compartilhada para evitar que o React.StrictMode em dev
// abra e mate o WebSocket em 1ms causando erros EPIPE no proxy do Vite.
let sharedSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function getSharedSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!sharedSocket) {
    sharedSocket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });
  }
  return sharedSocket;
}

export function useGameSocket() {
  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [nickname, setNicknameState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEYS.NICKNAME) || ''
  );
  const [invitedRoomCode, setInvitedRoomCode] = useState<string>(
    () => getRoomCodeFromUrl() || ''
  );
  const [roomState, setRoomState] = useState<RoomStateDTO | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const errorTimerRef = useRef<number | null>(null);

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    if (errorTimerRef.current) {
      window.clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = window.setTimeout(() => {
      setErrorMessage(null);
    }, 4500);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const setNickname = useCallback((name: string) => {
    setNicknameState(name);
    localStorage.setItem(STORAGE_KEYS.NICKNAME, name.trim());
  }, []);

  useEffect(() => {
    const socket = getSharedSocket();
    socketRef.current = socket;

    const attemptAutoRejoin = () => {
      const urlRoom = getRoomCodeFromUrl();
      const savedRoom = localStorage.getItem(STORAGE_KEYS.ROOM_CODE);
      const targetRoom = urlRoom || savedRoom;
      const savedNick = localStorage.getItem(STORAGE_KEYS.NICKNAME);

      if (urlRoom) {
        setInvitedRoomCode(urlRoom);
      }

      if (targetRoom && savedNick && savedNick.trim()) {
        socket.emit(
          'entrar_sala',
          {
            playerId,
            nickname: savedNick.trim(),
            roomCode: targetRoom.trim().toUpperCase(),
          },
          (res) => {
            if (!res.ok) {
              localStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
              setRoomState(null);
            }
          }
        );
      }
    };

    const onConnect = () => {
      setIsConnected(true);
      attemptAutoRejoin();
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onUpdateState = (state: RoomStateDTO) => {
      setRoomState(state);
      localStorage.setItem(STORAGE_KEYS.ROOM_CODE, state.roomCode);
      updateUrlRoomParam(state.roomCode);
      setIsLoading(false);
    };

    const onOperationError = ({ mensagem }: { mensagem: string }) => {
      showError(mensagem);
      setIsLoading(false);
    };

    const onRoomClosed = ({ mensagem }: { mensagem: string }) => {
      localStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
      updateUrlRoomParam(null);
      setRoomState(null);
      showError(mensagem);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('atualizar_estado', onUpdateState);
    socket.on('erro_operacao', onOperationError);
    socket.on('sala_encerrada', onRoomClosed);

    if (socket.connected) {
      onConnect();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!socket.connected) {
          socket.connect();
        } else {
          attemptAutoRejoin();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('atualizar_estado', onUpdateState);
      socket.off('erro_operacao', onOperationError);
      socket.off('sala_encerrada', onRoomClosed);
    };
  }, [playerId, showError]);

  const createRoom = useCallback(
    (nickInput: string) => {
      const cleanNick = nickInput.trim();
      if (!cleanNick) {
        showError('Digite seu codinome (Nickname) antes de criar uma sala.');
        return;
      }
      setNickname(cleanNick);
      setIsLoading(true);
      socketRef.current?.emit(
        'criar_sala',
        { playerId, nickname: cleanNick },
        (res) => {
          setIsLoading(false);
          if (res.ok && res.roomCode) {
            localStorage.setItem(STORAGE_KEYS.ROOM_CODE, res.roomCode);
            updateUrlRoomParam(res.roomCode);
          } else if (res.erro) {
            showError(res.erro);
          }
        }
      );
    },
    [playerId, setNickname, showError]
  );

  const joinRoom = useCallback(
    (nickInput: string, roomCodeInput: string) => {
      const cleanNick = nickInput.trim();
      const cleanCode = roomCodeInput.trim().toUpperCase();
      if (!cleanNick) {
        showError('Digite seu codinome (Nickname) antes de entrar na sala.');
        return;
      }
      if (cleanCode.length !== 4) {
        showError('O código da sala deve ter 4 caracteres.');
        return;
      }
      setNickname(cleanNick);
      setIsLoading(true);
      socketRef.current?.emit(
        'entrar_sala',
        { playerId, nickname: cleanNick, roomCode: cleanCode },
        (res) => {
          setIsLoading(false);
          if (res.ok && res.roomCode) {
            localStorage.setItem(STORAGE_KEYS.ROOM_CODE, res.roomCode);
            updateUrlRoomParam(res.roomCode);
          } else if (res.erro) {
            showError(res.erro);
          }
        }
      );
    },
    [playerId, setNickname, showError]
  );

  const switchTeam = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('trocar_time', {
      roomCode: roomState.roomCode,
      playerId,
    });
  }, [roomState, playerId]);

  const shuffleTeams = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('sortear_times', {
      roomCode: roomState.roomCode,
      playerId,
    });
  }, [roomState, playerId]);

  const startGame = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('iniciar_partida', {
      roomCode: roomState.roomCode,
      playerId,
    });
  }, [roomState, playerId]);

  const sendClue = useCallback(
    (palavra: string, numero: number) => {
      if (!roomState) return;
      socketRef.current?.emit('enviar_dica', {
        roomCode: roomState.roomCode,
        playerId,
        palavra,
        numero,
      });
    },
    [roomState, playerId]
  );

  const pointCard = useCallback(
    (cardIndex: number | null) => {
      if (!roomState) return;
      socketRef.current?.emit('apontar_carta', {
        roomCode: roomState.roomCode,
        playerId,
        cardIndex,
      });
    },
    [roomState, playerId]
  );

  const revealCard = useCallback(
    (cardIndex: number) => {
      if (!roomState) return;
      socketRef.current?.emit('revelar_carta', {
        roomCode: roomState.roomCode,
        playerId,
        cardIndex,
      });
    },
    [roomState, playerId]
  );

  const passTurn = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('passar_turno', {
      roomCode: roomState.roomCode,
      playerId,
    });
  }, [roomState, playerId]);

  const nextMatch = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('proxima_partida', {
      roomCode: roomState.roomCode,
      playerId,
    });
  }, [roomState, playerId]);

  const backToLobby = useCallback(() => {
    if (!roomState) return;
    socketRef.current?.emit('voltar_lobby', {
      roomCode: roomState.roomCode,
      playerId,
    });
  }, [roomState, playerId]);

  const leaveRoom = useCallback(() => {
    if (roomState) {
      socketRef.current?.emit('sair_sala', {
        roomCode: roomState.roomCode,
        playerId,
      });
    }
    localStorage.removeItem(STORAGE_KEYS.ROOM_CODE);
    updateUrlRoomParam(null);
    setInvitedRoomCode('');
    setRoomState(null);
  }, [roomState, playerId]);

  return {
    playerId,
    nickname,
    setNickname,
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
  };
}
