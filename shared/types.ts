export type GameId = 'codenames' | 'spyfall';

export type TeamColor = 'azul' | 'vermelho';

export type CardRealColor = 'azul' | 'vermelho' | 'neutro' | 'assassino';

export type CardVisibleColor = CardRealColor | 'oculta';

export type GamePhase = 'LOBBY' | 'JOGO' | 'FIM';

export type PlayerRole = 'capitao' | 'portaVoz' | 'agente';

export type WinReason = 'TODAS_CARTAS' | 'ASSASSINO' | 'CARTAS_INIMIGO';

export type SpyfallDurationMinutes = 5 | 7 | 8;

export type SpyfallSubphase = 'INTERROGATORIO' | 'VOTACAO' | 'CARTADA_FINAL';

export type SpyfallWinner = 'impostor' | 'inocentes';

export type SpyfallWinReason =
  | 'VOTACAO_INOCENTE'
  | 'CARTADA_ACERTOU'
  | 'CARTADA_ERROU'
  | 'CARTADA_TEMPO_ESGOTADO'
  | 'ARRISCOU_ACERTOU'
  | 'ARRISCOU_ERROU';

export interface SpyfallVoteStateDTO {
  chamadoPorId: string;
  chamadoPorNickname: string;
  totalVotantes: number;
  votosRecebidos: number;
  jaVotei: boolean;
  meuVotoId: string | null;
}

export interface SpyfallPlayerEndRevealDTO {
  playerId: string;
  nickname: string;
  ehImpostor: boolean;
  cargo: string | null;
}

export interface SpyfallStateDTO {
  subfase: SpyfallSubphase;
  ehImpostor: boolean;
  local: string | null;
  cargo: string | null;
  listaLocais: string[];
  primeiroAPerguntarId: string;
  primeiroAPerguntarNickname: string;
  duracaoMinutos: SpyfallDurationMinutes;
  fimTimerTimestamp: number | null;
  tempoRestanteMs: number;
  fimCartadaTimestamp: number | null;
  tempoRestanteCartadaMs: number;
  impostorReveladoId: string | null;
  impostorReveladoNickname: string | null;
  chamouVotacao: boolean;
  votacaoAtual: SpyfallVoteStateDTO | null;
  vencedor: SpyfallWinner | null;
  motivoVitoria: SpyfallWinReason | null;
  localSecretoFim: string | null;
  revelacaoJogadores: SpyfallPlayerEndRevealDTO[];
  ultimoPalpiteLocal: string | null;
}

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
  jogoAtual: GameId;
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
  spyfallConfig: {
    duracaoMinutos: SpyfallDurationMinutes;
  };
  spyfall?: SpyfallStateDTO;
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
  selecionar_jogo: (payload: { roomCode: string; playerId: string; jogo: GameId }) => void;
  configurar_spyfall: (payload: { roomCode: string; playerId: string; duracaoMinutos: SpyfallDurationMinutes }) => void;
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
  spyfall_chamar_votacao: (payload: RoomActionPayload) => void;
  spyfall_votar: (payload: { roomCode: string; playerId: string; suspeitoId: string }) => void;
  spyfall_arriscar_local: (payload: RoomActionPayload) => void;
  spyfall_adivinhar_local: (payload: { roomCode: string; playerId: string; localEscolhido: string }) => void;
}
