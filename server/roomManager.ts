import {
  GameId,
  RoomStateDTO,
  SpyfallDurationMinutes,
  TeamColor,
  TurnLogEntry,
} from '../shared/types.ts';
import {
  CodenamesEngine,
  createInitialCodenamesState,
} from './engines/codenamesEngine.ts';
import { SpyfallEngine } from './engines/spyfallEngine.ts';
import { InternalPlayer, InternalRoom } from './roomTypes.ts';

export type { InternalPlayer, InternalRoom } from './roomTypes.ts';

export class RoomManager {
  private rooms: Map<string, InternalRoom> = new Map();
  private socketToRoom: Map<string, { roomCode: string; playerId: string }> = new Map();
  private lanUrl: string = '';

  private codenamesEngine = new CodenamesEngine();
  private spyfallEngine = new SpyfallEngine();

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
      jogoAtual: 'codenames',
      fase: 'LOBBY',
      partidaNumero: 0,
      jogadores: new Map([[playerId, initialPlayer]]),
      spyfallConfig: {
        duracaoMinutos: 5,
      },
      ultimoLocalSpyfall: null,
      codenames: createInitialCodenamesState(playerId),
      spyfall: null,
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

    const assignedTeam = this.codenamesEngine.chooseSmallestTeam(room);
    const newPlayer: InternalPlayer = {
      playerId,
      socketId,
      nickname: cleanNick,
      team: assignedTeam,
      connected: true,
    };

    room.jogadores.set(playerId, newPlayer);
    room.codenames.filas[assignedTeam].push(playerId);
    this.codenamesEngine.syncQueues(room);

    this.socketToRoom.set(socketId, { roomCode, playerId });
    this.addLog(
      room,
      'SISTEMA',
      `${cleanNick} entrou na sala (${assignedTeam === 'azul' ? 'Esquadrão Azul' : 'Esquadrão Vermelho'}).`,
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

    if (room.jogoAtual === 'spyfall' && room.fase === 'JOGO') {
      this.spyfallEngine.resolveVoteIfComplete(room);
    }

    return room;
  }

  public leaveRoom(
    socketId: string,
    roomCode: string,
    playerId: string
  ): InternalRoom | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return null;

    const player = room.jogadores.get(playerId);
    if (!player) return room;

    this.socketToRoom.delete(socketId);
    room.jogadores.delete(playerId);
    this.codenamesEngine.syncQueues(room);

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

    if (room.jogoAtual === 'spyfall' && room.fase === 'JOGO') {
      this.spyfallEngine.resolveVoteIfComplete(room);
    }

    this.addLog(room, 'SISTEMA', `${player.nickname} saiu da sala.`);
    return room;
  }

  public selectGame(
    roomCode: string,
    playerId: string,
    jogo: GameId
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode escolher o jogo.' };
    }
    if (room.fase !== 'LOBBY') {
      return { ok: false, erro: 'Volte ao Lobby para trocar de jogo.' };
    }
    if (jogo !== 'codenames' && jogo !== 'spyfall') {
      return { ok: false, erro: 'Jogo inválido.' };
    }

    room.jogoAtual = jogo;
    this.addLog(
      room,
      'SISTEMA',
      `Host selecionou o jogo: ${jogo === 'codenames' ? 'Código Secreto' : 'O Impostor'}.`
    );

    return { ok: true, room };
  }

  public configureSpyfall(
    roomCode: string,
    playerId: string,
    duracaoMinutos: SpyfallDurationMinutes
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode alterar a duração da rodada.' };
    }
    if (room.fase !== 'LOBBY') {
      return { ok: false, erro: 'Só é possível alterar a duração no Lobby.' };
    }
    if (duracaoMinutos !== 5 && duracaoMinutos !== 7 && duracaoMinutos !== 8) {
      return { ok: false, erro: 'Duração inválida. Escolha 5, 7 ou 8 minutos.' };
    }

    room.spyfallConfig.duracaoMinutos = duracaoMinutos;
    return { ok: true, room };
  }

  public switchTeam(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.codenamesEngine.switchTeam(room, playerId);
  }

  public shuffleTeams(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.codenamesEngine.shuffleTeams(room, playerId);
  }

  public startGame(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };

    if (room.jogoAtual === 'spyfall') {
      return this.spyfallEngine.startMatch(room, playerId);
    }
    return this.codenamesEngine.startGame(room, playerId);
  }

  public nextMatch(
    roomCode: string,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };

    if (room.jogoAtual === 'spyfall') {
      return this.spyfallEngine.startMatch(room, playerId);
    }
    return this.codenamesEngine.nextMatchRotateCaptains(room, playerId);
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
    room.spyfall = null;
    this.codenamesEngine.resetForLobby(room);
    this.addLog(room, 'SISTEMA', 'O Host retornou a sala para o Hub Lobby.');

    return { ok: true, room };
  }

  // Ações de Código Secreto
  public sendClue(roomCode: string, playerId: string, palavra: string, numero: number) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.codenamesEngine.sendClue(room, playerId, palavra, numero);
  }

  public pointCard(roomCode: string, playerId: string, cardIndex: number | null) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.codenamesEngine.pointCard(room, playerId, cardIndex);
  }

  public revealCard(roomCode: string, playerId: string, cardIndex: number) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.codenamesEngine.revealCard(room, playerId, cardIndex);
  }

  public passTurn(roomCode: string, playerId: string) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.codenamesEngine.passTurn(room, playerId);
  }

  // Ações de O Impostor (Spyfall)
  public callSpyfallVote(roomCode: string, playerId: string) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.spyfallEngine.callVote(room, playerId);
  }

  public castSpyfallVote(roomCode: string, playerId: string, suspeitoId: string) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.spyfallEngine.castVote(room, playerId, suspeitoId);
  }

  public impostorRiskLocation(roomCode: string, playerId: string) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.spyfallEngine.impostorRiskLocation(room, playerId);
  }

  public impostorGuessLocation(
    roomCode: string,
    playerId: string,
    localEscolhido: string
  ) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, erro: 'Sala não encontrada.' };
    return this.spyfallEngine.impostorGuessLocation(room, playerId, localEscolhido);
  }

  public tickTimers(): InternalRoom[] {
    const changedRooms: InternalRoom[] = [];
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (this.spyfallEngine.tickRoomTimer(room, now)) {
        changedRooms.push(room);
      }
    }
    return changedRooms;
  }

  public buildStateForPlayer(room: InternalRoom, targetPlayerId: string): RoomStateDTO {
    const codenamesFields = this.codenamesEngine.buildDTOFields(room, targetPlayerId);
    const spyfallDTO = this.spyfallEngine.buildDTO(room, targetPlayerId);

    return {
      roomCode: room.roomCode,
      hostId: room.hostId,
      jogoAtual: room.jogoAtual,
      fase: room.fase,
      partidaNumero: room.partidaNumero,
      ...codenamesFields,
      spyfallConfig: { ...room.spyfallConfig },
      ...(spyfallDTO ? { spyfall: spyfallDTO } : {}),
      lanUrl: this.lanUrl || undefined,
    };
  }
}
