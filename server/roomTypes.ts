import {
  CardRealColor,
  ClueDTO,
  GameId,
  GamePhase,
  SpyfallDurationMinutes,
  SpyfallSubphase,
  SpyfallWinReason,
  SpyfallWinner,
  TeamColor,
  TurnLogEntry,
  WinReason,
} from '../shared/types.ts';

export interface InternalPlayer {
  playerId: string;
  socketId: string | null;
  nickname: string;
  team: TeamColor;
  connected: boolean;
}

export interface InternalCard {
  index: number;
  palavra: string;
  revelada: boolean;
  corReal: CardRealColor;
}

export interface CodenamesInternalState {
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
  turnoAtual: TeamColor;
  timeInicial: TeamColor;
  aguardandoDica: boolean;
  dicaAtual: ClueDTO | null;
  palpitesRestantes: number;
  tabuleiro: InternalCard[];
  cartaApontadaIndex: number | null;
  palavrasPartidaAnterior: Set<string>;
  vencedor: TeamColor | null;
  motivoVitoria: WinReason | null;
}

export interface SpyfallInternalVote {
  chamadoPorId: string;
  chamadoPorNickname: string;
  votantesIds: string[];
  votos: Map<string, string>;
}

export interface SpyfallInternalState {
  subfase: SpyfallSubphase;
  local: string;
  impostorId: string;
  cargosPorJogador: Map<string, string>;
  participantesIds: string[];
  primeiroAPerguntarId: string;
  duracaoMinutos: SpyfallDurationMinutes;
  fimTimerTimestamp: number | null;
  tempoRestantePausadoMs: number | null;
  fimCartadaTimestamp: number | null;
  chamadoresDeVotacao: Set<string>;
  votacaoAtual: SpyfallInternalVote | null;
  arriscouAntesDoFim: boolean;
  vencedor: SpyfallWinner | null;
  motivoVitoria: SpyfallWinReason | null;
  ultimoPalpiteLocal: string | null;
}

export interface InternalRoom {
  roomCode: string;
  hostId: string;
  jogoAtual: GameId;
  fase: GamePhase;
  partidaNumero: number;
  jogadores: Map<string, InternalPlayer>;
  spyfallConfig: {
    duracaoMinutos: SpyfallDurationMinutes;
  };
  ultimoLocalSpyfall: string | null;
  codenames: CodenamesInternalState;
  spyfall: SpyfallInternalState | null;
  historico: TurnLogEntry[];
  createdAt: number;
}
