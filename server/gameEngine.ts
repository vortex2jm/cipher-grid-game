import {
  CardRealColor,
  ClueDTO,
  GamePhase,
  PlayerDTO,
  PlayerRole,
  RoomStateDTO,
  TeamColor,
  TurnLogEntry,
  WinReason,
} from '../shared/types.ts';
import { WORD_DICTIONARY } from './words.ts';

interface InternalPlayer {
  playerId: string;
  socketId: string | null;
  nickname: string;
  team: TeamColor;
  connected: boolean;
}

interface InternalCard {
  index: number;
  palavra: string;
  revelada: boolean;
  corReal: CardRealColor;
}

export interface InternalRoom {
  roomCode: string;
  hostId: string;
  fase: GamePhase;
  partidaNumero: number;
  jogadores: Map<string, InternalPlayer>;
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
  historico: TurnLogEntry[];
  createdAt: number;
}

function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class GameEngine {
  private rooms: Map<string, InternalRoom> = new Map();
  private socketToRoom: Map<string, { roomCode: string; playerId: string }> = new Map();
  private lanUrl: string = '';

  public setLanUrl(url: string): void {
    this.lanUrl = url;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  private addLog(
    room: InternalRoom,
    tipo: TurnLogEntry['tipo'],
    mensagem: string,
    time?: TeamColor
  ): void {
    room.historico.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      tipo,
      time,
      mensagem,
    });
    if (room.historico.length > 40) {
      room.historico.length = 40;
    }
  }

  public getRoom(roomCode: string): InternalRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  private chooseSmallestTeam(room: InternalRoom): TeamColor {
    return room.filas.azul.length <= room.filas.vermelho.length ? 'azul' : 'vermelho';
  }

  private syncQueues(room: InternalRoom): void {
    room.filas.azul = room.filas.azul.filter((id) => {
      const p = room.jogadores.get(id);
      return p && p.team === 'azul';
    });
    room.filas.vermelho = room.filas.vermelho.filter((id) => {
      const p = room.jogadores.get(id);
      return p && p.team === 'vermelho';
    });

    for (const [id, p] of room.jogadores.entries()) {
      const targetQueue = room.filas[p.team];
      if (!targetQueue.includes(id)) {
        targetQueue.push(id);
      }
    }

    if (room.filas.azul.length > 0) {
      room.indiceCapitao.azul = room.indiceCapitao.azul % room.filas.azul.length;
    } else {
      room.indiceCapitao.azul = 0;
    }

    if (room.filas.vermelho.length > 0) {
      room.indiceCapitao.vermelho = room.indiceCapitao.vermelho % room.filas.vermelho.length;
    } else {
      room.indiceCapitao.vermelho = 0;
    }

    const agentesAzul = this.getOrderedActiveAgents(room, 'azul');
    room.indicePortaVoz.azul =
      agentesAzul.length > 0 ? room.indicePortaVoz.azul % agentesAzul.length : 0;

    const agentesVermelho = this.getOrderedActiveAgents(room, 'vermelho');
    room.indicePortaVoz.vermelho =
      agentesVermelho.length > 0 ? room.indicePortaVoz.vermelho % agentesVermelho.length : 0;
  }

  public getCaptainId(room: InternalRoom, team: TeamColor): string | null {
    const fila = room.filas[team];
    if (fila.length === 0) return null;
    const idx = room.indiceCapitao[team] % fila.length;
    return fila[idx] ?? null;
  }

  /**
   * Retorna os Agentes ativos (todos exceto o Capitão) mantendo a ordem circular
   * imediatamente após o Capitão da fila.
   */
  public getOrderedActiveAgents(room: InternalRoom, team: TeamColor): string[] {
    const fila = room.filas[team];
    if (fila.length <= 1) return [];
    const capIdx = room.indiceCapitao[team] % fila.length;
    const agents: string[] = [];
    for (let offset = 1; offset < fila.length; offset++) {
      agents.push(fila[(capIdx + offset) % fila.length]);
    }
    return agents;
  }

  public getSpokespersonId(room: InternalRoom, team: TeamColor): string | null {
    const agents = this.getOrderedActiveAgents(room, team);
    if (agents.length === 0) return null;
    const idx = room.indicePortaVoz[team] % agents.length;
    return agents[idx] ?? null;
  }

  public getPlayerRole(room: InternalRoom, playerId: string): PlayerRole {
    if (room.fase === 'LOBBY') {
      return 'agente';
    }
    const player = room.jogadores.get(playerId);
    if (!player) return 'agente';

    const captainId = this.getCaptainId(room, player.team);
    if (captainId === playerId) return 'capitao';

    const spokespersonId = this.getSpokespersonId(room, player.team);
    if (spokespersonId === playerId) return 'portaVoz';

    return 'agente';
  }

  public createRoom(
    socketId: string,
    playerId: string,
    nickname: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const cleanNick = nickname.trim().slice(0, 20);
    if (!cleanNick) {
      return { ok: false, erro: 'Informe um nickname válido.' };
    }

    const roomCode = this.generateRoomCode();
    const initialPlayer: InternalPlayer = {
      playerId,
      socketId,
      nickname: cleanNick,
      team: 'azul',
      connected: true,
    };

    const room: InternalRoom = {
      roomCode,
      hostId: playerId,
      fase: 'LOBBY',
      partidaNumero: 0,
      jogadores: new Map([[playerId, initialPlayer]]),
      filas: {
        azul: [playerId],
        vermelho: [],
      },
      indiceCapitao: { azul: 0, vermelho: 0 },
      indicePortaVoz: { azul: 0, vermelho: 0 },
      turnoAtual: 'azul',
      timeInicial: 'azul',
      aguardandoDica: true,
      dicaAtual: null,
      palpitesRestantes: 0,
      tabuleiro: [],
      cartaApontadaIndex: null,
      palavrasPartidaAnterior: new Set(),
      vencedor: null,
      motivoVitoria: null,
      historico: [],
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socketId, { roomCode, playerId });
    this.addLog(room, 'SISTEMA', `Sala ${roomCode} criada por ${cleanNick}.`);

    return { ok: true, room };
  }

  public joinRoom(
    socketId: string,
    playerId: string,
    nickname: string,
    rawRoomCode: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const roomCode = rawRoomCode.trim().toUpperCase();
    const cleanNick = nickname.trim().slice(0, 20);

    if (!cleanNick) {
      return { ok: false, erro: 'Informe um nickname válido.' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { ok: false, erro: `Sala "${roomCode}" não encontrada.` };
    }

    const existing = room.jogadores.get(playerId);
    if (existing) {
      // Reconexão preservando lugar na fila, time e papel
      if (existing.socketId && existing.socketId !== socketId) {
        this.socketToRoom.delete(existing.socketId);
      }
      existing.socketId = socketId;
      existing.nickname = cleanNick || existing.nickname;
      existing.connected = true;
      this.socketToRoom.set(socketId, { roomCode, playerId });
      return { ok: true, room };
    }

    const assignedTeam = this.chooseSmallestTeam(room);
    const newPlayer: InternalPlayer = {
      playerId,
      socketId,
      nickname: cleanNick,
      team: assignedTeam,
      connected: true,
    };

    room.jogadores.set(playerId, newPlayer);
    room.filas[assignedTeam].push(playerId);
    this.syncQueues(room);

    this.socketToRoom.set(socketId, { roomCode, playerId });
    this.addLog(
      room,
      'SISTEMA',
      `${cleanNick} entrou no Esquadrão ${assignedTeam === 'azul' ? 'Azul' : 'Vermelho'}.`,
      assignedTeam
    );

    return { ok: true, room };
  }

  public handleDisconnect(socketId: string): InternalRoom | null {
    const mapping = this.socketToRoom.get(socketId);
    if (!mapping) return null;

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(mapping.roomCode);
    if (!room) return null;

    const player = room.jogadores.get(mapping.playerId);
    if (player && player.socketId === socketId) {
      player.connected = false;
      player.socketId = null;
    }

    return room;
  }

  public leaveRoom(socketId: string, roomCode: string, playerId: string): InternalRoom | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return null;

    const player = room.jogadores.get(playerId);
    if (!player) return room;

    this.socketToRoom.delete(socketId);
    room.jogadores.delete(playerId);
    this.syncQueues(room);

    if (room.jogadores.size === 0) {
      this.rooms.delete(room.roomCode);
      return null;
    }

    if (room.hostId === playerId) {
      const nextHost = room.jogadores.keys().next().value;
      if (nextHost) {
        room.hostId = nextHost;
      }
    }

    this.addLog(room, 'SISTEMA', `${player.nickname} saiu da operação.`);
    return room;
  }

  public switchTeam(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.fase !== 'LOBBY') {
      return { ok: false, erro: 'Só é possível trocar de time no Lobby.' };
    }

    const player = room.jogadores.get(playerId);
    if (!player) return { ok: false, erro: 'Jogador não encontrado.' };

    const oldTeam = player.team;
    const newTeam: TeamColor = oldTeam === 'azul' ? 'vermelho' : 'azul';

    room.filas[oldTeam] = room.filas[oldTeam].filter((id) => id !== playerId);
    player.team = newTeam;
    room.filas[newTeam].push(playerId);
    this.syncQueues(room);

    return { ok: true, room };
  }

  public shuffleTeams(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode sortear os times.' };
    }
    if (room.fase !== 'LOBBY') {
      return { ok: false, erro: 'Só é possível sortear os times no Lobby.' };
    }

    const allIds = shuffleArray(Array.from(room.jogadores.keys()));
    room.filas.azul = [];
    room.filas.vermelho = [];

    const firstTeam: TeamColor = Math.random() < 0.5 ? 'azul' : 'vermelho';
    const secondTeam: TeamColor = firstTeam === 'azul' ? 'vermelho' : 'azul';

    allIds.forEach((id, idx) => {
      const p = room.jogadores.get(id);
      if (!p) return;
      const team = idx % 2 === 0 ? firstTeam : secondTeam;
      p.team = team;
      room.filas[team].push(id);
    });

    room.indiceCapitao = { azul: 0, vermelho: 0 };
    room.indicePortaVoz = { azul: 0, vermelho: 0 };
    this.syncQueues(room);
    this.addLog(room, 'SISTEMA', 'Equipes sorteadas e balanceadas pelo Host.');

    return { ok: true, room };
  }

  private generateBoard(room: InternalRoom): void {
    const timeInicial: TeamColor = Math.random() < 0.5 ? 'azul' : 'vermelho';
    const segundoTime: TeamColor = timeInicial === 'azul' ? 'vermelho' : 'azul';

    room.timeInicial = timeInicial;
    room.turnoAtual = timeInicial;
    room.aguardandoDica = true;
    room.dicaAtual = null;
    room.palpitesRestantes = 0;
    room.cartaApontadaIndex = null;
    room.vencedor = null;
    room.motivoVitoria = null;

    // Filtra palavras que não saíram na partida imediatamente anterior
    const availableWords = WORD_DICTIONARY.filter(
      (w) => !room.palavrasPartidaAnterior.has(w)
    );
    const pool = availableWords.length >= 25 ? availableWords : WORD_DICTIONARY;
    const selectedWords = shuffleArray(pool).slice(0, 25);

    room.palavrasPartidaAnterior = new Set(selectedWords);

    // 9 do time inicial, 8 do segundo time, 7 neutras e 1 assassino = 25 cartas
    const colors: CardRealColor[] = [
      ...Array(9).fill(timeInicial),
      ...Array(8).fill(segundoTime),
      ...Array(7).fill('neutro'),
      'assassino',
    ];
    const shuffledColors = shuffleArray(colors);

    room.tabuleiro = selectedWords.map((palavra, index) => ({
      index,
      palavra,
      revelada: false,
      corReal: shuffledColors[index],
    }));
  }

  public startGame(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode iniciar a partida.' };
    }
    if (room.filas.azul.length < 2 || room.filas.vermelho.length < 2) {
      return {
        ok: false,
        erro: 'São necessários pelo menos 2 jogadores no Time Azul e 2 no Time Vermelho.',
      };
    }

    this.syncQueues(room);

    if (room.partidaNumero === 0) {
      room.indiceCapitao = { azul: 0, vermelho: 0 };
    }
    room.indicePortaVoz = { azul: 0, vermelho: 0 };
    room.partidaNumero += 1;
    room.fase = 'JOGO';
    room.historico = [];

    this.generateBoard(room);

    const capAzul = room.jogadores.get(this.getCaptainId(room, 'azul') ?? '')?.nickname ?? '?';
    const capVermelho =
      room.jogadores.get(this.getCaptainId(room, 'vermelho') ?? '')?.nickname ?? '?';

    this.addLog(
      room,
      'SISTEMA',
      `Partida #${room.partidaNumero} iniciada! Capitães: ${capAzul} (Azul) & ${capVermelho} (Vermelho).`
    );

    return { ok: true, room };
  }

  public nextMatchRotateCaptains(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode iniciar a próxima partida.' };
    }
    if (room.filas.azul.length < 2 || room.filas.vermelho.length < 2) {
      return {
        ok: false,
        erro: 'Cada time precisa de pelo menos 2 jogadores para continuar.',
      };
    }

    this.syncQueues(room);

    // Rotaciona Capitães circularmente em +1 e reseta Porta-voz para o 1º agente após o novo Capitão
    room.indiceCapitao.azul = (room.indiceCapitao.azul + 1) % room.filas.azul.length;
    room.indiceCapitao.vermelho = (room.indiceCapitao.vermelho + 1) % room.filas.vermelho.length;
    room.indicePortaVoz = { azul: 0, vermelho: 0 };

    room.partidaNumero += 1;
    room.fase = 'JOGO';
    room.historico = [];

    this.generateBoard(room);

    const capAzul = room.jogadores.get(this.getCaptainId(room, 'azul') ?? '')?.nickname ?? '?';
    const capVermelho =
      room.jogadores.get(this.getCaptainId(room, 'vermelho') ?? '')?.nickname ?? '?';

    this.addLog(
      room,
      'SISTEMA',
      `Partida #${room.partidaNumero} — Capitães rotacionados! Azul: ${capAzul} | Vermelho: ${capVermelho}.`
    );

    return { ok: true, room };
  }

  public backToLobby(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode voltar ao Lobby.' };
    }

    room.fase = 'LOBBY';
    room.dicaAtual = null;
    room.cartaApontadaIndex = null;
    room.vencedor = null;
    room.motivoVitoria = null;
    this.addLog(room, 'SISTEMA', 'O Host retornou a sala para o Lobby.');

    return { ok: true, room };
  }

  private advanceTurn(room: InternalRoom): void {
    const teamThatJustPlayed = room.turnoAtual;
    const activeAgents = this.getOrderedActiveAgents(room, teamThatJustPlayed);
    if (activeAgents.length > 0) {
      room.indicePortaVoz[teamThatJustPlayed] =
        (room.indicePortaVoz[teamThatJustPlayed] + 1) % activeAgents.length;
    }

    room.turnoAtual = teamThatJustPlayed === 'azul' ? 'vermelho' : 'azul';
    room.aguardandoDica = true;
    room.dicaAtual = null;
    room.palpitesRestantes = 0;
    room.cartaApontadaIndex = null;
  }

  private countRemainingCards(room: InternalRoom): { azul: number; vermelho: number } {
    let azul = 0;
    let vermelho = 0;
    for (const card of room.tabuleiro) {
      if (!card.revelada) {
        if (card.corReal === 'azul') azul++;
        if (card.corReal === 'vermelho') vermelho++;
      }
    }
    return { azul, vermelho };
  }

  public sendClue(
    roomCode: string,
    playerId: string,
    rawWord: string,
    numero: number
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.fase !== 'JOGO' || !room.aguardandoDica) {
      return { ok: false, erro: 'Não é o momento de enviar dica.' };
    }

    const expectedCaptainId = this.getCaptainId(room, room.turnoAtual);
    if (playerId !== expectedCaptainId) {
      return { ok: false, erro: 'Apenas o Capitão do time da vez pode enviar a dica.' };
    }

    const trimmed = rawWord.trim().toUpperCase();
    if (!trimmed) {
      return { ok: false, erro: 'Digite uma palavra para a dica.' };
    }
    if (/\s/.test(trimmed)) {
      return { ok: false, erro: 'A dica deve conter apenas UMA única palavra (sem espaços).' };
    }

    const normalizedClue = normalizeString(trimmed);
    const matchesBoardWord = room.tabuleiro.some(
      (c) => normalizeString(c.palavra) === normalizedClue
    );
    if (matchesBoardWord) {
      return {
        ok: false,
        erro: 'A dica não pode ser igual a nenhuma carta presente no tabuleiro!',
      };
    }

    const parsedNum = Number(numero);
    if (!Number.isInteger(parsedNum) || parsedNum < 1 || parsedNum > 9) {
      return { ok: false, erro: 'O número da dica deve ser entre 1 e 9.' };
    }

    const captain = room.jogadores.get(playerId);
    room.dicaAtual = {
      palavra: trimmed,
      numero: parsedNum,
      autorNickname: captain?.nickname ?? 'Capitão',
      time: room.turnoAtual,
    };
    room.aguardandoDica = false;
    room.palpitesRestantes = parsedNum + 1;
    room.cartaApontadaIndex = null;

    this.addLog(
      room,
      'DICA',
      `Capitão ${captain?.nickname ?? ''} transmitiu a dica: "${trimmed} — ${parsedNum}"`,
      room.turnoAtual
    );

    return { ok: true, room };
  }

  public pointCard(
    roomCode: string,
    playerId: string,
    cardIndex: number | null
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.fase !== 'JOGO' || room.aguardandoDica) {
      return { ok: false, erro: 'Aguarde a dica do Capitão antes de selecionar uma carta.' };
    }

    const expectedSpokespersonId = this.getSpokespersonId(room, room.turnoAtual);
    if (playerId !== expectedSpokespersonId) {
      return { ok: false, erro: 'Apenas o Porta-voz da vez pode selecionar cartas.' };
    }

    if (cardIndex === null) {
      room.cartaApontadaIndex = null;
      return { ok: true, room };
    }

    const card = room.tabuleiro[cardIndex];
    if (!card || card.revelada) {
      return { ok: false, erro: 'Carta inválida ou já revelada.' };
    }

    room.cartaApontadaIndex = room.cartaApontadaIndex === cardIndex ? null : cardIndex;
    return { ok: true, room };
  }

  public revealCard(
    roomCode: string,
    playerId: string,
    cardIndex: number
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.fase !== 'JOGO' || room.aguardandoDica) {
      return { ok: false, erro: 'Não é possível revelar cartas neste momento.' };
    }

    const expectedSpokespersonId = this.getSpokespersonId(room, room.turnoAtual);
    if (playerId !== expectedSpokespersonId) {
      return {
        ok: false,
        erro: 'Ação bloqueada: apenas o Porta-voz do turno atual pode confirmar o palpite.',
      };
    }

    const card = room.tabuleiro[cardIndex];
    if (!card || card.revelada) {
      return { ok: false, erro: 'Esta carta já foi revelada.' };
    }

    const spokesperson = room.jogadores.get(playerId);
    const activeTeam = room.turnoAtual;
    const opposingTeam: TeamColor = activeTeam === 'azul' ? 'vermelho' : 'azul';

    card.revelada = true;
    room.cartaApontadaIndex = null;

    const remaining = this.countRemainingCards(room);

    // 1. Carta Assassino
    if (card.corReal === 'assassino') {
      room.fase = 'FIM';
      room.vencedor = opposingTeam;
      room.motivoVitoria = 'ASSASSINO';
      this.addLog(
        room,
        'PALPITE_ASSASSINO',
        `${spokesperson?.nickname ?? 'Porta-voz'} acionou o ASSASSINO na carta [${card.palavra}]! Vitória imediata do time ${opposingTeam.toUpperCase()}!`,
        activeTeam
      );
      return { ok: true, room };
    }

    // 2. Carta do próprio time
    if (card.corReal === activeTeam) {
      this.addLog(
        room,
        'PALPITE_ACERTO',
        `${spokesperson?.nickname ?? 'Porta-voz'} confirmou [${card.palavra}] — Agente aliado encontrado!`,
        activeTeam
      );

      if (remaining[activeTeam] === 0) {
        room.fase = 'FIM';
        room.vencedor = activeTeam;
        room.motivoVitoria = 'TODAS_CARTAS';
        this.addLog(
          room,
          'SISTEMA',
          `Todos os agentes do Esquadrão ${activeTeam.toUpperCase()} foram localizados!`,
          activeTeam
        );
        return { ok: true, room };
      }

      room.palpitesRestantes -= 1;
      if (room.palpitesRestantes <= 0) {
        this.addLog(
          room,
          'SISTEMA',
          `Palpites esgotados para o Esquadrão ${activeTeam.toUpperCase()}. Passando o turno.`
        );
        this.advanceTurn(room);
      }
      return { ok: true, room };
    }

    // 3. Carta Neutra (Civil)
    if (card.corReal === 'neutro') {
      this.addLog(
        room,
        'PALPITE_NEUTRO',
        `${spokesperson?.nickname ?? 'Porta-voz'} investigou [${card.palavra}] — Civil Inocente. Turno encerrado.`,
        activeTeam
      );
      this.advanceTurn(room);
      return { ok: true, room };
    }

    // 4. Carta do Time Inimigo
    if (card.corReal === opposingTeam) {
      this.addLog(
        room,
        'PALPITE_INIMIGO',
        `${spokesperson?.nickname ?? 'Porta-voz'} revelou [${card.palavra}] — Agente INIMIGO (${opposingTeam.toUpperCase()})!`,
        activeTeam
      );

      if (remaining[opposingTeam] === 0) {
        room.fase = 'FIM';
        room.vencedor = opposingTeam;
        room.motivoVitoria = 'CARTAS_INIMIGO';
        this.addLog(
          room,
          'SISTEMA',
          `A última carta do Esquadrão ${opposingTeam.toUpperCase()} foi revelada!`,
          opposingTeam
        );
        return { ok: true, room };
      }

      this.advanceTurn(room);
      return { ok: true, room };
    }

    return { ok: true, room };
  }

  public passTurn(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.fase !== 'JOGO' || room.aguardandoDica) {
      return { ok: false, erro: 'Você só pode encerrar o turno durante a fase de palpites.' };
    }

    const expectedSpokespersonId = this.getSpokespersonId(room, room.turnoAtual);
    if (playerId !== expectedSpokespersonId) {
      return { ok: false, erro: 'Apenas o Porta-voz atual pode encerrar o turno.' };
    }

    const spokesperson = room.jogadores.get(playerId);
    this.addLog(
      room,
      'PASSOU_TURNO',
      `${spokesperson?.nickname ?? 'Porta-voz'} encerrou o turno voluntariamente.`,
      room.turnoAtual
    );

    this.advanceTurn(room);
    return { ok: true, room };
  }

  /**
   * Constrói o estado sanitizado (Anti-Cheat) específico para o `targetPlayerId`.
   * Se o jogador NÃO for Capitão e `fase !== 'FIM'`, cartas não reveladas
   * jamais expõem sua `corReal`, recebendo `cor: 'oculta'`.
   */
  public buildStateForPlayer(room: InternalRoom, targetPlayerId: string): RoomStateDTO {
    const targetPlayer = room.jogadores.get(targetPlayerId);
    const meuTime: TeamColor = targetPlayer?.team ?? 'azul';
    const meuPapel: PlayerRole = this.getPlayerRole(room, targetPlayerId);

    const canSeeHiddenColors = meuPapel === 'capitao' || room.fase === 'FIM';
    const remaining = this.countRemainingCards(room);

    const jogadoresDTO: PlayerDTO[] = [];
    for (const team of ['azul', 'vermelho'] as const) {
      room.filas[team].forEach((id, idx) => {
        const p = room.jogadores.get(id);
        if (!p) return;
        jogadoresDTO.push({
          playerId: p.playerId,
          nickname: p.nickname,
          team: p.team,
          connected: p.connected,
          isHost: p.playerId === room.hostId,
          role: this.getPlayerRole(room, p.playerId),
          queuePosition: idx + 1,
        });
      });
    }

    const tabuleiroDTO = room.tabuleiro.map((card) => ({
      index: card.index,
      palavra: card.palavra,
      revelada: card.revelada,
      cor: card.revelada || canSeeHiddenColors ? card.corReal : ('oculta' as const),
      destacada: room.cartaApontadaIndex === card.index && !card.revelada,
    }));

    return {
      roomCode: room.roomCode,
      hostId: room.hostId,
      fase: room.fase,
      partidaNumero: room.partidaNumero,
      meuPlayerId: targetPlayerId,
      meuTime,
      meuPapel,
      jogadores: jogadoresDTO,
      filas: {
        azul: [...room.filas.azul],
        vermelho: [...room.filas.vermelho],
      },
      indiceCapitao: { ...room.indiceCapitao },
      indicePortaVoz: { ...room.indicePortaVoz },
      capitaoAtualId: {
        azul: room.fase === 'LOBBY' ? null : this.getCaptainId(room, 'azul'),
        vermelho: room.fase === 'LOBBY' ? null : this.getCaptainId(room, 'vermelho'),
      },
      portaVozAtualId: {
        azul: room.fase === 'LOBBY' ? null : this.getSpokespersonId(room, 'azul'),
        vermelho: room.fase === 'LOBBY' ? null : this.getSpokespersonId(room, 'vermelho'),
      },
      turnoAtual: room.turnoAtual,
      timeInicial: room.timeInicial,
      aguardandoDica: room.aguardandoDica,
      dicaAtual: room.dicaAtual ? { ...room.dicaAtual } : null,
      palpitesRestantes: room.palpitesRestantes,
      cartasRestantes: remaining,
      tabuleiro: tabuleiroDTO,
      cartaApontadaIndex: room.cartaApontadaIndex,
      vencedor: room.vencedor,
      motivoVitoria: room.motivoVitoria,
      historico: room.historico,
      lanUrl: this.lanUrl || undefined,
    };
  }
}

