import {
  SpyfallPlayerEndRevealDTO,
  SpyfallStateDTO,
  SpyfallVoteStateDTO,
  TurnLogEntry,
} from '../../shared/types.ts';
import { SPYFALL_LOCATIONS } from '../data/spyfallLocations.ts';
import { InternalRoom, SpyfallInternalState } from '../roomTypes.ts';

const CARTADA_FINAL_MS = 15_000;

const ALL_LOCATION_NAMES: string[] = SPYFALL_LOCATIONS.map((l) => l.nome).sort((a, b) =>
  a.localeCompare(b, 'pt-BR')
);

function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class SpyfallEngine {
  private addLog(room: InternalRoom, mensagem: string): void {
    const entry: TurnLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      tipo: 'SISTEMA',
      mensagem,
    };
    room.historico.unshift(entry);
    if (room.historico.length > 40) {
      room.historico.length = 40;
    }
  }

  public startMatch(
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    if (room.hostId !== playerId) {
      return { ok: false, erro: 'Apenas o Host pode iniciar a partida.' };
    }

    const activePlayers = Array.from(room.jogadores.values()).filter((p) => p.connected);
    if (activePlayers.length < 3) {
      return {
        ok: false,
        erro: 'São necessários pelo menos 3 jogadores conectados para jogar O Impostor.',
      };
    }

    const availableLocations = SPYFALL_LOCATIONS.filter(
      (loc) => loc.nome !== room.ultimoLocalSpyfall
    );
    const pool = availableLocations.length > 0 ? availableLocations : SPYFALL_LOCATIONS;
    const chosenLocation = pool[Math.floor(Math.random() * pool.length)];
    room.ultimoLocalSpyfall = chosenLocation.nome;

    const shuffledPlayers = shuffleArray(activePlayers);
    const impostor = shuffledPlayers[Math.floor(Math.random() * shuffledPlayers.length)];
    const firstQuestioner =
      shuffledPlayers[Math.floor(Math.random() * shuffledPlayers.length)];

    const shuffledRoles = shuffleArray(chosenLocation.cargos);
    const cargosPorJogador = new Map<string, string>();

    let roleIdx = 0;
    for (const p of shuffledPlayers) {
      if (p.playerId === impostor.playerId) continue;
      const role = shuffledRoles[roleIdx % shuffledRoles.length];
      cargosPorJogador.set(p.playerId, role);
      roleIdx += 1;
    }

    const duracaoMinutos = room.spyfallConfig.duracaoMinutos;
    const now = Date.now();

    const state: SpyfallInternalState = {
      subfase: 'INTERROGATORIO',
      local: chosenLocation.nome,
      impostorId: impostor.playerId,
      cargosPorJogador,
      participantesIds: shuffledPlayers.map((p) => p.playerId),
      primeiroAPerguntarId: firstQuestioner.playerId,
      duracaoMinutos,
      fimTimerTimestamp: now + duracaoMinutos * 60 * 1000,
      tempoRestantePausadoMs: null,
      fimCartadaTimestamp: null,
      chamadoresDeVotacao: new Set(),
      votacaoAtual: null,
      arriscouAntesDoFim: false,
      vencedor: null,
      motivoVitoria: null,
      ultimoPalpiteLocal: null,
    };

    room.spyfall = state;
    room.partidaNumero += 1;
    room.fase = 'JOGO';
    room.historico = [];

    this.addLog(
      room,
      `Partida #${room.partidaNumero} de O Impostor iniciada! ${firstQuestioner.nickname} faz a primeira pergunta.`
    );

    return { ok: true, room };
  }

  public callVote(
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const spy = room.spyfall;
    if (!spy || room.jogoAtual !== 'spyfall' || room.fase !== 'JOGO') {
      return { ok: false, erro: 'Partida de O Impostor não está ativa.' };
    }
    if (spy.subfase !== 'INTERROGATORIO') {
      return { ok: false, erro: 'Já existe uma votação ou cartada final em andamento.' };
    }
    if (!spy.participantesIds.includes(playerId)) {
      return { ok: false, erro: 'Apenas participantes da rodada podem chamar votação.' };
    }
    if (spy.chamadoresDeVotacao.has(playerId)) {
      return {
        ok: false,
        erro: 'Você já utilizou seu direito de chamar votação nesta partida.',
      };
    }

    const caller = room.jogadores.get(playerId);
    const connectedParticipantIds = spy.participantesIds.filter((id) => {
      const p = room.jogadores.get(id);
      return Boolean(p && p.connected);
    });

    const eligibleVoters =
      connectedParticipantIds.length > 0 ? connectedParticipantIds : spy.participantesIds;

    spy.chamadoresDeVotacao.add(playerId);
    spy.tempoRestantePausadoMs = Math.max(
      0,
      (spy.fimTimerTimestamp ?? Date.now()) - Date.now()
    );
    spy.fimTimerTimestamp = null;
    spy.subfase = 'VOTACAO';
    spy.votacaoAtual = {
      chamadoPorId: playerId,
      chamadoPorNickname: caller?.nickname ?? 'Jogador',
      votantesIds: eligibleVoters,
      votos: new Map(),
    };

    this.addLog(
      room,
      `🚨 ${caller?.nickname ?? 'Um jogador'} pausou o relógio e abriu uma votação!`
    );

    return { ok: true, room };
  }

  public castVote(
    room: InternalRoom,
    playerId: string,
    suspeitoId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const spy = room.spyfall;
    if (!spy || room.jogoAtual !== 'spyfall' || room.fase !== 'JOGO') {
      return { ok: false, erro: 'Partida não está ativa.' };
    }
    if (spy.subfase !== 'VOTACAO' || !spy.votacaoAtual) {
      return { ok: false, erro: 'Nenhuma votação aberta no momento.' };
    }
    if (!spy.participantesIds.includes(playerId)) {
      return { ok: false, erro: 'Você não está participando desta rodada.' };
    }
    if (!spy.participantesIds.includes(suspeitoId)) {
      return { ok: false, erro: 'Suspeito inválido.' };
    }

    if (!spy.votacaoAtual.votantesIds.includes(playerId)) {
      spy.votacaoAtual.votantesIds.push(playerId);
    }

    spy.votacaoAtual.votos.set(playerId, suspeitoId);
    this.resolveVoteIfComplete(room);

    return { ok: true, room };
  }

  public resolveVoteIfComplete(room: InternalRoom): boolean {
    const spy = room.spyfall;
    if (!spy || spy.subfase !== 'VOTACAO' || !spy.votacaoAtual || room.fase !== 'JOGO') {
      return false;
    }

    const activeVoters = spy.votacaoAtual.votantesIds.filter((id) => {
      const p = room.jogadores.get(id);
      return Boolean(p && p.connected);
    });
    const votersToWait = activeVoters.length > 0 ? activeVoters : spy.votacaoAtual.votantesIds;

    const allVoted = votersToWait.every((id) => spy.votacaoAtual!.votos.has(id));
    if (!allVoted) {
      return false;
    }

    const counts = new Map<string, number>();
    let totalVotes = 0;
    for (const id of votersToWait) {
      const target = spy.votacaoAtual.votos.get(id);
      if (target) {
        counts.set(target, (counts.get(target) ?? 0) + 1);
        totalVotes += 1;
      }
    }

    let accusedId: string | null = null;
    for (const [candidateId, count] of counts.entries()) {
      if (count > totalVotes / 2) {
        accusedId = candidateId;
        break;
      }
    }

    if (!accusedId) {
      // Sem maioria absoluta: retoma o cronômetro de interrogatório
      const remaining = spy.tempoRestantePausadoMs ?? 0;
      spy.fimTimerTimestamp = Date.now() + remaining;
      spy.tempoRestantePausadoMs = null;
      spy.subfase = 'INTERROGATORIO';
      spy.votacaoAtual = null;
      this.addLog(room, 'Sem maioria absoluta na votação! O cronômetro voltou a rodar.');
      return true;
    }

    const accusedPlayer = room.jogadores.get(accusedId);
    if (accusedId === spy.impostorId) {
      // Impostor foi desmascarado -> Cartada Final (15s)
      spy.votacaoAtual = null;
      spy.tempoRestantePausadoMs = null;
      spy.subfase = 'CARTADA_FINAL';
      spy.fimCartadaTimestamp = Date.now() + CARTADA_FINAL_MS;
      this.addLog(
        room,
        `🎯 Maioria absoluta votou em ${accusedPlayer?.nickname ?? 'Impostor'}! Ele era o Impostor e tem 15s para a Cartada Final!`
      );
      return true;
    }

    // Maioria votou em um Inocente -> Impostor vence na hora!
    spy.votacaoAtual = null;
    spy.tempoRestantePausadoMs = null;
    spy.fimTimerTimestamp = null;
    spy.fimCartadaTimestamp = null;
    room.fase = 'FIM';
    spy.vencedor = 'impostor';
    spy.motivoVitoria = 'VOTACAO_INOCENTE';
    this.addLog(
      room,
      `💀 A maioria acusou ${accusedPlayer?.nickname ?? 'um Inocente'}, que era INOCENTE! Vitória imediata do Impostor!`
    );
    return true;
  }

  public impostorRiskLocation(
    room: InternalRoom,
    playerId: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const spy = room.spyfall;
    if (!spy || room.jogoAtual !== 'spyfall' || room.fase !== 'JOGO') {
      return { ok: false, erro: 'Partida não está ativa.' };
    }
    if (playerId !== spy.impostorId) {
      return { ok: false, erro: 'Apenas o Impostor pode arriscar o local.' };
    }
    if (spy.subfase !== 'INTERROGATORIO') {
      return { ok: false, erro: 'Ação disponível apenas durante o interrogatório.' };
    }

    const impostor = room.jogadores.get(playerId);
    spy.arriscouAntesDoFim = true;
    spy.fimTimerTimestamp = null;
    spy.tempoRestantePausadoMs = null;
    spy.votacaoAtual = null;
    spy.subfase = 'CARTADA_FINAL';
    spy.fimCartadaTimestamp = Date.now() + CARTADA_FINAL_MS;

    this.addLog(
      room,
      `🎯 ${impostor?.nickname ?? 'O Impostor'} revelou sua identidade para arriscar o local agora! (15s)`
    );

    return { ok: true, room };
  }

  public impostorGuessLocation(
    room: InternalRoom,
    playerId: string,
    localEscolhido: string
  ): { ok: boolean; room?: InternalRoom; erro?: string } {
    const spy = room.spyfall;
    if (!spy || room.jogoAtual !== 'spyfall' || room.fase !== 'JOGO') {
      return { ok: false, erro: 'Partida não está ativa.' };
    }
    if (spy.subfase !== 'CARTADA_FINAL') {
      return { ok: false, erro: 'Não estamos na fase de Cartada Final.' };
    }
    if (playerId !== spy.impostorId) {
      return { ok: false, erro: 'Apenas o Impostor pode escolher o local na Cartada Final.' };
    }

    const valid = ALL_LOCATION_NAMES.includes(localEscolhido);
    if (!valid) {
      return { ok: false, erro: 'Local inválido.' };
    }

    spy.ultimoPalpiteLocal = localEscolhido;
    spy.fimTimerTimestamp = null;
    spy.fimCartadaTimestamp = null;
    spy.tempoRestantePausadoMs = null;
    room.fase = 'FIM';

    const acertou = localEscolhido === spy.local;
    if (acertou) {
      spy.vencedor = 'impostor';
      spy.motivoVitoria = spy.arriscouAntesDoFim ? 'ARRISCOU_ACERTOU' : 'CARTADA_ACERTOU';
      this.addLog(
        room,
        `🕵️ O Impostor arriscou "${localEscolhido}" e ACERTOU! Vitória do Impostor!`
      );
    } else {
      spy.vencedor = 'inocentes';
      spy.motivoVitoria = spy.arriscouAntesDoFim ? 'ARRISCOU_ERROU' : 'CARTADA_ERROU';
      this.addLog(
        room,
        `✅ O Impostor chutou "${localEscolhido}", mas o local era "${spy.local}"! Vitória dos Inocentes!`
      );
    }

    return { ok: true, room };
  }

  public tickRoomTimer(room: InternalRoom, now: number = Date.now()): boolean {
    const spy = room.spyfall;
    if (!spy || room.jogoAtual !== 'spyfall' || room.fase !== 'JOGO') {
      return false;
    }

    if (
      spy.subfase === 'INTERROGATORIO' &&
      spy.fimTimerTimestamp !== null &&
      now >= spy.fimTimerTimestamp
    ) {
      spy.subfase = 'CARTADA_FINAL';
      spy.fimTimerTimestamp = null;
      spy.tempoRestantePausadoMs = null;
      spy.fimCartadaTimestamp = now + CARTADA_FINAL_MS;
      const impostor = room.jogadores.get(spy.impostorId);
      this.addLog(
        room,
        `⏰ Tempo esgotado! ${impostor?.nickname ?? 'O Impostor'} foi exposto e tem 15s para a Cartada Final!`
      );
      return true;
    }

    if (
      spy.subfase === 'CARTADA_FINAL' &&
      spy.fimCartadaTimestamp !== null &&
      now >= spy.fimCartadaTimestamp
    ) {
      spy.fimCartadaTimestamp = null;
      room.fase = 'FIM';
      spy.vencedor = 'inocentes';
      spy.motivoVitoria = 'CARTADA_TEMPO_ESGOTADO';
      this.addLog(
        room,
        `⌛ Os 15 segundos da Cartada Final acabaram! Vitória dos Inocentes! (Local: ${spy.local})`
      );
      return true;
    }

    return false;
  }

  /**
   * Constrói o estado sanitizado (Anti-Cheat) de O Impostor para o jogador alvo.
   * O Impostor JAMAIS recebe o nome do local nem cargos antes de fase === 'FIM'.
   */
  public buildDTO(room: InternalRoom, targetPlayerId: string): SpyfallStateDTO | undefined {
    const spy = room.spyfall;
    if (!spy || room.jogoAtual !== 'spyfall') {
      return undefined;
    }

    const isImpostor = targetPlayerId === spy.impostorId;
    const isParticipant = spy.participantesIds.includes(targetPlayerId);
    const isGameOver = room.fase === 'FIM';
    const isFinalShotOrEnd = spy.subfase === 'CARTADA_FINAL' || isGameOver;
    const now = Date.now();

    let tempoRestanteMs = 0;
    if (spy.subfase === 'INTERROGATORIO' && spy.fimTimerTimestamp !== null) {
      tempoRestanteMs = Math.max(0, spy.fimTimerTimestamp - now);
    } else if (spy.subfase === 'VOTACAO' && spy.tempoRestantePausadoMs !== null) {
      tempoRestanteMs = Math.max(0, spy.tempoRestantePausadoMs);
    }

    const tempoRestanteCartadaMs =
      spy.subfase === 'CARTADA_FINAL' && spy.fimCartadaTimestamp !== null
        ? Math.max(0, spy.fimCartadaTimestamp - now)
        : 0;

    let votacaoAtualDTO: SpyfallVoteStateDTO | null = null;
    if (spy.votacaoAtual) {
      const activeVoters = spy.votacaoAtual.votantesIds.filter((id) => {
        const p = room.jogadores.get(id);
        return Boolean(p && p.connected);
      });
      const votersPool =
        activeVoters.length > 0 ? activeVoters : spy.votacaoAtual.votantesIds;
      const votosRecebidos = votersPool.filter((id) =>
        spy.votacaoAtual!.votos.has(id)
      ).length;

      votacaoAtualDTO = {
        chamadoPorId: spy.votacaoAtual.chamadoPorId,
        chamadoPorNickname: spy.votacaoAtual.chamadoPorNickname,
        totalVotantes: votersPool.length,
        votosRecebidos,
        jaVotei: spy.votacaoAtual.votos.has(targetPlayerId),
        meuVotoId: spy.votacaoAtual.votos.get(targetPlayerId) ?? null,
      };
    }

    const revelacaoJogadores: SpyfallPlayerEndRevealDTO[] = isGameOver
      ? spy.participantesIds.map((id) => {
          const p = room.jogadores.get(id);
          const ehImp = id === spy.impostorId;
          return {
            playerId: id,
            nickname: p?.nickname ?? 'Jogador',
            ehImpostor: ehImp,
            cargo: ehImp ? null : spy.cargosPorJogador.get(id) ?? null,
          };
        })
      : [];

    const firstQuestioner = room.jogadores.get(spy.primeiroAPerguntarId);
    const impostorPlayer = room.jogadores.get(spy.impostorId);

    return {
      subfase: spy.subfase,
      ehImpostor: isImpostor,
      local: isImpostor || !isParticipant ? null : spy.local,
      cargo: isImpostor || !isParticipant ? null : spy.cargosPorJogador.get(targetPlayerId) ?? null,
      listaLocais: ALL_LOCATION_NAMES,
      primeiroAPerguntarId: spy.primeiroAPerguntarId,
      primeiroAPerguntarNickname: firstQuestioner?.nickname ?? 'Jogador',
      duracaoMinutos: spy.duracaoMinutos,
      fimTimerTimestamp: spy.fimTimerTimestamp,
      tempoRestanteMs,
      fimCartadaTimestamp: spy.fimCartadaTimestamp,
      tempoRestanteCartadaMs,
      impostorReveladoId: isFinalShotOrEnd ? spy.impostorId : null,
      impostorReveladoNickname: isFinalShotOrEnd ? impostorPlayer?.nickname ?? 'Impostor' : null,
      chamouVotacao: spy.chamadoresDeVotacao.has(targetPlayerId),
      votacaoAtual: votacaoAtualDTO,
      vencedor: spy.vencedor,
      motivoVitoria: spy.motivoVitoria,
      localSecretoFim: isGameOver ? spy.local : null,
      revelacaoJogadores,
      ultimoPalpiteLocal: spy.ultimoPalpiteLocal,
    };
  }
}
