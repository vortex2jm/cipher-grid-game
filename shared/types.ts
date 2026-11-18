export type TeamColor = 'azul' | 'vermelho';

export type CardRealColor = 'azul' | 'vermelho' | 'neutro' | 'assassino';

export type CardVisibleColor = CardRealColor | 'oculta';

export type GamePhase = 'LOBBY' | 'JOGO' | 'FIM';

export type PlayerRole = 'capitao' | 'portaVoz' | 'agente';

export type WinReason = 'TODAS_CARTAS' | 'ASSASSINO' | 'CARTAS_INIMIGO';

export interface PlayerDTO {
  playerId: string;
  nickname: string;
  team: TeamColor;
  connected: boolean;
  isHost: boolean;
  role: PlayerRole;
  queuePosition: number;
}

export interface CardDTO {
  index: number;
  palavra: string;
  revelada: boolean;
  cor: CardVisibleColor;
  destacada: boolean;
}

export interface ClueDTO {
  palavra: string;
  numero: number;
  autorNickname: string;
  time: TeamColor;
}

export interface TurnLogEntry {
  id: string;
  timestamp: number;
  tipo: 'DICA' | 'PALPITE_ACERTO' | 'PALPITE_NEUTRO' | 'PALPITE_INIMIGO' | 'PALPITE_ASSASSINO' | 'PASSOU_TURNO' | 'SISTEMA';
  time?: TeamColor;
  mensagem: string;
}

export interface RoomStateDTO {
  roomCode: string;
  hostId: string;
  fase: GamePhase;
  partidaNumero: number;
  meuPlayerId: string;
  meuTime: TeamColor;
  meuPapel: PlayerRole;
  jogadores: PlayerDTO[];
  filas: {
    azul: string[];
    vermelho: string[];
  };
  indiceCapitao: {
    azul: number;
    vermelho: number;
  };
  indicePortaVoz: {
    azul: number;
    vermelho: number;
  };
  capitaoAtualId: {
    azul: string | null;
    vermelho: string | null;
  };
  portaVozAtualId: {
    azul: string | null;
    vermelho: string | null;
  };
  turnoAtual: TeamColor;
  timeInicial: TeamColor;
  aguardandoDica: boolean;
  dicaAtual: ClueDTO | null;
  palpitesRestantes: number;
  cartasRestantes: {
    azul: number;
    vermelho: number;
  };
  tabuleiro: CardDTO[];
  cartaApontadaIndex: number | null;
  vencedor: TeamColor | null;
  motivoVitoria: WinReason | null;
  historico: TurnLogEntry[];
  lanUrl?: string;
}

// Payloads de Cliente -> Servidor
export interface CreateRoomPayload {
  playerId: string;
  nickname: string;
}

export interface JoinRoomPayload {
  playerId: string;
  nickname: string;
  roomCode: string;
}

export interface SendCluePayload {
  roomCode: string;
  playerId: string;
  palavra: string;
  numero: number;
}

export interface PointCardPayload {
  roomCode: string;
  playerId: string;
  cardIndex: number | null;
}

export interface RevealCardPayload {
  roomCode: string;
  playerId: string;
  cardIndex: number;
}

export interface RoomActionPayload {
  roomCode: string;
  playerId: string;
}

// Eventos tipados do Socket.io
export interface ServerToClientEvents {
  atualizar_estado: (state: RoomStateDTO) => void;
  erro_operacao: (data: { mensagem: string }) => void;
  sala_encerrada: (data: { mensagem: string }) => void;
}

export interface ClientToServerEvents {
  criar_sala: (payload: CreateRoomPayload, callback?: (res: { ok: boolean; roomCode?: string; erro?: string }) => void) => void;
  entrar_sala: (payload: JoinRoomPayload, callback?: (res: { ok: boolean; roomCode?: string; erro?: string }) => void) => void;
  trocar_time: (payload: RoomActionPayload) => void;
  sortear_times: (payload: RoomActionPayload) => void;
  iniciar_partida: (payload: RoomActionPayload) => void;
  enviar_dica: (payload: SendCluePayload) => void;
  apontar_carta: (payload: PointCardPayload) => void;
  revelar_carta: (payload: RevealCardPayload) => void;
  passar_turno: (payload: RoomActionPayload) => void;
  proxima_partida: (payload: RoomActionPayload) => void;
  voltar_lobby: (payload: RoomActionPayload) => void;
  sair_sala: (payload: RoomActionPayload) => void;
}

