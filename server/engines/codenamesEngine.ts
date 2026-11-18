import {
  CardRealColor,
  PlayerDTO,
  PlayerRole,
  RoomStateDTO,
  TeamColor,
  TurnLogEntry,
} from '../../shared/types.ts';
import { WORD_DICTIONARY } from '../data/codenamesWords.ts';
import { CodenamesInternalState, InternalRoom } from '../roomTypes.ts';

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

export function createInitialCodenamesState(initialPlayerId?: string): CodenamesInternalState {
  return {
    filas: {
      azul: initialPlayerId ? [initialPlayerId] : [],
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
  };
}

export class CodenamesEngine {
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

  public chooseSmallestTeam(room: InternalRoom): TeamColor {
    return room.codenames.filas.azul.length <= room.codenames.filas.vermelho.length
      ? 'azul'
      : 'vermelho';
  }

  public syncQueues(room: InternalRoom): void {
    const cn = room.codenames;
    cn.filas.azul = cn.filas.azul.filter((id) => {
      const p = room.jogadores.get(id);
      return p && p.team === 'azul';
    });
    cn.filas.vermelho = cn.filas.vermelho.filter((id) => {
      const p = room.jogadores.get(id);
      return p && p.team === 'vermelho';
    });

    for (const [id, p] of room.jogadores.entries()) {
      const targetQueue = cn.filas[p.team];
      if (!targetQueue.includes(id)) {
        targetQueue.push(id);
      }
    }

    if (cn.filas.azul.length > 0) {
      cn.indiceCapitao.azul = cn.indiceCapitao.azul % cn.filas.azul.length;
    } else {
      cn.indiceCapitao.azul = 0;
    }

    if (cn.filas.vermelho.length > 0) {
      cn.indiceCapitao.vermelho = cn.indiceCapitao.vermelho % cn.filas.vermelho.length;
    } else {
      cn.indiceCapitao.vermelho = 0;
    }

    const agentesAzul = this.getOrderedActiveAgents(room, 'azul');
    cn.indicePortaVoz.azul =
      agentesAzul.length > 0 ? cn.indicePortaVoz.azul % agentesAzul.length : 0;

    const agentesVermelho = this.getOrderedActiveAgents(room, 'vermelho');
    cn.indicePortaVoz.vermelho =
      agentesVermelho.length > 0 ? cn.indicePortaVoz.vermelho % agentesVermelho.length : 0;
  }

  public getCaptainId(room: InternalRoom, team: TeamColor): string | null {
    const fila = room.codenames.filas[team];
    if (fila.length === 0) return null;
    const idx = room.codenames.indiceCapitao[team] % fila.length;
    return fila[idx] ?? null;
  }

  /**
   * Retorna os Agentes ativos (todos exceto o Capitão) mantendo a ordem circular
   * imediatamente após o Capitão da fila.
   */
  public getOrderedActiveAgents(room: InternalRoom, team: TeamColor): string[] {
    const fila = room.codenames.filas[team];
    if (fila.length <= 1) return [];
    const capIdx = room.codenames.indiceCapitao[team] % fila.length;
    const agents: string[] = [];
    for (let offset = 1; offset < fila.length; offset++) {
      agents.push(fila[(capIdx + offset) % fila.length]);
    }
    return agents;
  }

  public getSpokespersonId(room: InternalRoom, team: TeamColor): string | null {
    const agents = this.getOrderedActiveAgents(room, team);
    if (agents.length === 0) return null;
    const idx = room.codenames.indicePortaVoz[team] % agents.length;
    return agents[idx] ?? null;
  }

  public getPlayerRole(room: InternalRoom, playerId: string): PlayerRole {
    if (room.fase === 'LOBBY' || room.jogoAtual !== 'codenames') {
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

  public switchTeam(
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    if (room.fase !== 'LOBBY') {
      return { ok: false, erro: 'Só é possível trocar de time no Lobby.' };
    }

    const player = room.jogadores.get(playerId);
    if (!player) return { ok: false, erro: 'Jogador não encontrado.' };

    const oldTeam = player.team;
    const newTeam: TeamColor = oldTeam === 'azul' ? 'vermelho' : 'azul';

    room.codenames.filas[oldTeam] = room.codenames.filas[oldTeam].filter(
      (id) => id !== playerId
    );
    player.team = newTeam;
    room.codenames.filas[newTeam].push(playerId);
    this.syncQueues(room);

    return { ok: true, room };
  }

  public shuffleTeams(
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode sortear os times.' };
    }
    if (room.fase !== 'LOBBY') {
      return { ok: false, erro: 'Só é possível sortear os times no Lobby.' };
    }

    const allIds = shuffleArray(Array.from(room.jogadores.keys()));
    room.codenames.filas.azul = [];
    room.codenames.filas.vermelho = [];

    const firstTeam: TeamColor = Math.random() < 0.5 ? 'azul' : 'vermelho';
    const secondTeam: TeamColor = firstTeam === 'azul' ? 'vermelho' : 'azul';

    allIds.forEach((id, idx) => {
      const p = room.jogadores.get(id);
      if (!p) return;
      const team = idx % 2 === 0 ? firstTeam : secondTeam;
      p.team = team;
      room.codenames.filas[team].push(id);
    });

    room.codenames.indiceCapitao = { azul: 0, vermelho: 0 };
    room.codenames.indicePortaVoz = { azul: 0, vermelho: 0 };
    this.syncQueues(room);
    this.addLog(room, 'SISTEMA', 'Equipes sorteadas e balanceadas pelo Host.');

    return { ok: true, room };
  }

  private generateBoard(room: InternalRoom): void {
    const cn = room.codenames;
    const timeInicial: TeamColor = Math.random() < 0.5 ? 'azul' : 'vermelho';
    const segundoTime: TeamColor = timeInicial === 'azul' ? 'vermelho' : 'azul';

    cn.timeInicial = timeInicial;
    cn.turnoAtual = timeInicial;
    cn.aguardandoDica = true;
    cn.dicaAtual = null;
    cn.palpitesRestantes = 0;
    cn.cartaApontadaIndex = null;
    cn.vencedor = null;
    cn.motivoVitoria = null;

    // Filtra palavras que não saíram na partida imediatamente anterior
    const availableWords = WORD_DICTIONARY.filter(
      (w) => !cn.palavrasPartidaAnterior.has(w)
    );
    const pool = availableWords.length >= 25 ? availableWords : WORD_DICTIONARY;
    const selectedWords = shuffleArray(pool).slice(0, 25);

    cn.palavrasPartidaAnterior = new Set(selectedWords);

    // 9 do time inicial, 8 do segundo time, 7 neutras e 1 assassino = 25 cartas
    const colors: CardRealColor[] = [
      ...Array(9).fill(timeInicial),
      ...Array(8).fill(segundoTime),
      ...Array(7).fill('neutro'),
      'assassino',
    ];
    const shuffledColors = shuffleArray(colors);

    cn.tabuleiro = selectedWords.map((palavra, index) => ({
      index,
      palavra,
      revelada: false,
      corReal: shuffledColors[index],
    }));
  }

  public startGame(
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode iniciar a partida.' };
    }
    if (room.codenames.filas.azul.length < 2 || room.codenames.filas.vermelho.length < 2) {
      return {
        ok: false,
        erro: 'São necessários pelo menos 2 jogadores no Time Azul e 2 no Time Vermelho.',
      };
    }

    this.syncQueues(room);

    if (room.partidaNumero === 0) {
      room.codenames.indiceCapitao = { azul: 0, vermelho: 0 };
    }
    room.codenames.indicePortaVoz = { azul: 0, vermelho: 0 };
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
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode iniciar a próxima partida.' };
    }
    if (room.codenames.filas.azul.length < 2 || room.codenames.filas.vermelho.length < 2) {
      return {
        ok: false,
        erro: 'Cada time precisa de pelo menos 2 jogadores para continuar.',
      };
    }

    this.syncQueues(room);

    // Rotaciona Capitães circularmente em +1 e reseta Porta-voz para o 1º agente após o novo Capitão
    room.codenames.indiceCapitao.azul =
      (room.codenames.indiceCapitao.azul + 1) % room.codenames.filas.azul.length;
    room.codenames.indiceCapitao.vermelho =
      (room.codenames.indiceCapitao.vermelho + 1) % room.codenames.filas.vermelho.length;
    room.codenames.indicePortaVoz = { azul: 0, vermelho: 0 };

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

  public resetForLobby(room: InternalRoom): void {
    room.codenames.dicaAtual = null;
    room.codenames.cartaApontadaIndex = null;
    room.codenames.vencedor = null;
    room.codenames.motivoVitoria = null;
  }

  private advanceTurn(room: InternalRoom): void {
    const cn = room.codenames;
    const teamThatJustPlayed = cn.turnoAtual;
    const activeAgents = this.getOrderedActiveAgents(room, teamThatJustPlayed);
    if (activeAgents.length > 0) {
      cn.indicePortaVoz[teamThatJustPlayed] =
        (cn.indicePortaVoz[teamThatJustPlayed] + 1) % activeAgents.length;
    }

    cn.turnoAtual = teamThatJustPlayed === 'azul' ? 'vermelho' : 'azul';
    cn.aguardandoDica = true;
    cn.dicaAtual = null;
    cn.palpitesRestantes = 0;
    cn.cartaApontadaIndex = null;
  }

  private countRemainingCards(room: InternalRoom): { azul: number; vermelho: number } {
    let azul = 0;
    let vermelho = 0;
    for (const card of room.codenames.tabuleiro) {
      if (!card.revelada) {
        if (card.corReal === 'azul') azul++;
        if (card.corReal === 'vermelho') vermelho++;
      }
    }
    return { azul, vermelho };
  }

  public sendClue(
    room: InternalRoom,
    playerId: string,
    rawWord: string,
    numero: number
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const cn = room.codenames;
    if (room.jogoAtual !== 'codenames' || room.fase !== 'JOGO' || !cn.aguardandoDica) {
      return { ok: false, erro: 'Não é o momento de enviar dica.' };
    }

    const expectedCaptainId = this.getCaptainId(room, cn.turnoAtual);
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
    const matchesBoardWord = cn.tabuleiro.some(
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
    cn.dicaAtual = {
      palavra: trimmed,
      numero: parsedNum,
      autorNickname: captain?.nickname ?? 'Capitão',
      time: cn.turnoAtual,
    };
    cn.aguardandoDica = false;
    cn.palpitesRestantes = parsedNum + 1;
    cn.cartaApontadaIndex = null;

    this.addLog(
      room,
      'DICA',
      `Capitão ${captain?.nickname ?? ''} transmitiu a dica: "${trimmed} — ${parsedNum}"`,
      cn.turnoAtual
    );

    return { ok: true, room };
  }

  public pointCard(
    room: InternalRoom,
    playerId: string,
    cardIndex: number | null
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const cn = room.codenames;
    if (room.jogoAtual !== 'codenames' || room.fase !== 'JOGO' || cn.aguardandoDica) {
      return { ok: false, erro: 'Aguarde a dica do Capitão antes de selecionar uma carta.' };
    }

    const expectedSpokespersonId = this.getSpokespersonId(room, cn.turnoAtual);
    if (playerId !== expectedSpokespersonId) {
      return { ok: false, erro: 'Apenas o Porta-voz da vez pode selecionar cartas.' };
    }

    if (cardIndex === null) {
      cn.cartaApontadaIndex = null;
      return { ok: true, room };
    }

    const card = cn.tabuleiro[cardIndex];
    if (!card || card.revelada) {
      return { ok: false, erro: 'Carta inválida ou já revelada.' };
    }

    cn.cartaApontadaIndex = cn.cartaApontadaIndex === cardIndex ? null : cardIndex;
    return { ok: true, room };
  }

  public revealCard(
    room: InternalRoom,
    playerId: string,
    cardIndex: number
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const cn = room.codenames;
    if (room.jogoAtual !== 'codenames' || room.fase !== 'JOGO' || cn.aguardandoDica) {
      return { ok: false, erro: 'Não é possível revelar cartas neste momento.' };
    }

    const expectedSpokespersonId = this.getSpokespersonId(room, cn.turnoAtual);
    if (playerId !== expectedSpokespersonId) {
      return {
        ok: false,
        erro: 'Ação bloqueada: apenas o Porta-voz do turno atual pode confirmar o palpite.',
      };
    }

    const card = cn.tabuleiro[cardIndex];
    if (!card || card.revelada) {
      return { ok: false, erro: 'Esta carta já foi revelada.' };
    }

    const spokesperson = room.jogadores.get(playerId);
    const activeTeam = cn.turnoAtual;
    const opposingTeam: TeamColor = activeTeam === 'azul' ? 'vermelho' : 'azul';

    card.revelada = true;
    cn.cartaApontadaIndex = null;

    const remaining = this.countRemainingCards(room);

    // 1. Carta Assassino
    if (card.corReal === 'assassino') {
      room.fase = 'FIM';
      cn.vencedor = opposingTeam;
      cn.motivoVitoria = 'ASSASSINO';
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
        cn.vencedor = activeTeam;
        cn.motivoVitoria = 'TODAS_CARTAS';
        this.addLog(
          room,
          'SISTEMA',
          `Todos os agentes do Esquadrão ${activeTeam.toUpperCase()} foram localizados!`,
          activeTeam
        );
        return { ok: true, room };
      }

      cn.palpitesRestantes -= 1;
      if (cn.palpitesRestantes <= 0) {
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
        cn.vencedor = opposingTeam;
        cn.motivoVitoria = 'CARTAS_INIMIGO';
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
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const cn = room.codenames;
    if (room.jogoAtual !== 'codenames' || room.fase !== 'JOGO' || cn.aguardandoDica) {
      return { ok: false, erro: 'Você só pode encerrar o turno durante a fase de palpites.' };
    }

    const expectedSpokespersonId = this.getSpokespersonId(room, cn.turnoAtual);
    if (playerId !== expectedSpokespersonId) {
      return { ok: false, erro: 'Apenas o Porta-voz atual pode encerrar o turno.' };
    }

    const spokesperson = room.jogadores.get(playerId);
    this.addLog(
      room,
      'PASSOU_TURNO',
      `${spokesperson?.nickname ?? 'Porta-voz'} encerrou o turno voluntariamente.`,
      cn.turnoAtual
    );

    this.advanceTurn(room);
    return { ok: true, room };
  }

  public buildPlayerDTOs(room: InternalRoom): PlayerDTO[] {
    const jogadoresDTO: PlayerDTO[] = [];
    for (const team of ['azul', 'vermelho'] as const) {
      room.codenames.filas[team].forEach((id, idx) => {
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
    return jogadoresDTO;
  }

  /**
   * Constrói os campos sanitizados (Anti-Cheat) do Código Secreto para o `targetPlayerId`.
   * Se o jogador NÃO for Capitão e `fase !== 'FIM'`, cartas não reveladas
   * jamais expõem sua `corReal`, recebendo `cor: 'oculta'`.
   */
  public buildDTOFields(
    room: InternalRoom,
    targetPlayerId: string
  ): Omit<RoomStateDTO, 'roomCode' | 'hostId' | 'jogoAtual' | 'fase' | 'partidaNumero' | 'spyfallConfig' | 'spyfall' | 'lanUrl'> {
    const cn = room.codenames;
    const targetPlayer = room.jogadores.get(targetPlayerId);
    const meuTime: TeamColor = targetPlayer?.team ?? 'azul';
    const meuPapel: PlayerRole = this.getPlayerRole(room, targetPlayerId);

    const canSeeHiddenColors = meuPapel === 'capitao' || room.fase === 'FIM';
    const remaining = this.countRemainingCards(room);
    const jogadoresDTO = this.buildPlayerDTOs(room);

    const tabuleiroDTO = cn.tabuleiro.map((card) => ({
      index: card.index,
      palavra: card.palavra,
      revelada: card.revelada,
      cor: card.revelada || canSeeHiddenColors ? card.corReal : ('oculta' as const),
      destacada: cn.cartaApontadaIndex === card.index && !card.revelada,
    }));

    return {
      meuPlayerId: targetPlayerId,
      meuTime,
      meuPapel,
      jogadores: jogadoresDTO,
      filas: {
        azul: [...cn.filas.azul],
        vermelho: [...cn.filas.vermelho],
      },
      indiceCapitao: { ...cn.indiceCapitao },
      indicePortaVoz: { ...cn.indicePortaVoz },
      capitaoAtualId: {
        azul: room.fase === 'LOBBY' || room.jogoAtual !== 'codenames' ? null : this.getCaptainId(room, 'azul'),
        vermelho: room.fase === 'LOBBY' || room.jogoAtual !== 'codenames' ? null : this.getCaptainId(room, 'vermelho'),
      },
      portaVozAtualId: {
        azul: room.fase === 'LOBBY' || room.jogoAtual !== 'codenames' ? null : this.getSpokespersonId(room, 'azul'),
        vermelho: room.fase === 'LOBBY' || room.jogoAtual !== 'codenames' ? null : this.getSpokespersonId(room, 'vermelho'),
      },
      turnoAtual: cn.turnoAtual,
      timeInicial: cn.timeInicial,
      aguardandoDica: cn.aguardandoDica,
      dicaAtual: cn.dicaAtual ? { ...cn.dicaAtual } : null,
      palpitesRestantes: cn.palpitesRestantes,
      cartasRestantes: remaining,
      tabuleiro: tabuleiroDTO,
      cartaApontadaIndex: cn.cartaApontadaIndex,
      vencedor: cn.vencedor,
      motivoVitoria: cn.motivoVitoria,
      historico: room.historico,
    };
  }
}
