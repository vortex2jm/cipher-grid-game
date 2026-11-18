import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Crown,
  Eye,
  History,
  LogOut,
  Megaphone,
  QrCode,
  RotateCcw,
  Send,
  Shield,
  SkipForward,
  Skull,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { BRANDING } from '../../../shared/branding';
import { CardDTO, RoomStateDTO } from '../../../shared/types';
import { ShareRoomModal } from './ShareRoomModal';

interface GameBoardScreenProps {
  roomState: RoomStateDTO;
  onSendClue: (palavra: string, numero: number) => void;
  onPointCard: (cardIndex: number | null) => void;
  onRevealCard: (cardIndex: number) => void;
  onPassTurn: () => void;
  onNextMatch: () => void;
  onBackToLobby: () => void;
  onLeaveRoom: () => void;
}

export const GameBoardScreen: React.FC<GameBoardScreenProps> = ({
  roomState,
  onSendClue,
  onPointCard,
  onRevealCard,
  onPassTurn,
  onNextMatch,
  onBackToLobby,
  onLeaveRoom,
}) => {
  const [clueWord, setClueWord] = useState('');
  const [clueNumber, setClueNumber] = useState<number>(1);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const isGameOver = roomState.fase === 'FIM';
  const isHost = roomState.meuPlayerId === roomState.hostId;
  const isMyTeamTurn = roomState.meuTime === roomState.turnoAtual;
  const isCaptainOfCurrentTurn =
    !isGameOver &&
    roomState.meuPapel === 'capitao' &&
    isMyTeamTurn &&
    roomState.aguardandoDica;
  const isSpokespersonOfCurrentTurn =
    !isGameOver &&
    roomState.meuPapel === 'portaVoz' &&
    isMyTeamTurn &&
    !roomState.aguardandoDica;

  const currentTurnCaptain = roomState.jogadores.find(
    (j) => j.playerId === roomState.capitaoAtualId[roomState.turnoAtual]
  );
  const currentTurnSpokesperson = roomState.jogadores.find(
    (j) => j.playerId === roomState.portaVozAtualId[roomState.turnoAtual]
  );
  const myTeamSpokesperson = roomState.jogadores.find(
    (j) => j.playerId === roomState.portaVozAtualId[roomState.meuTime]
  );
  const myTeamCaptain = roomState.jogadores.find(
    (j) => j.playerId === roomState.capitaoAtualId[roomState.meuTime]
  );

  const pointedCard =
    roomState.cartaApontadaIndex !== null
      ? roomState.tabuleiro[roomState.cartaApontadaIndex] ?? null
      : null;

  // Dispara confete ao encerrar a partida
  useEffect(() => {
    if (isGameOver && roomState.vencedor) {
      const colors =
        roomState.vencedor === 'azul'
          ? ['#2563eb', '#60a5fa', '#38bdf8']
          : ['#e11d48', '#fb7185', '#f43f5e'];

      confetti({
        particleCount: 95,
        spread: 75,
        origin: { y: 0.6 },
        colors,
      });
    }
  }, [isGameOver, roomState.vencedor]);

  const handleClueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueWord.trim()) return;
    onSendClue(clueWord.trim().toUpperCase(), clueNumber);
    setClueWord('');
  };

  const getWinReasonText = () => {
    if (!roomState.vencedor) return '';
    const winnerName =
      roomState.vencedor === 'azul' ? 'ESQUADRÃO AZUL' : 'ESQUADRÃO VERMELHO';
    if (roomState.motivoVitoria === 'ASSASSINO') {
      return `A equipe adversária acionou o ASSASSINO! Vitória imediata do ${winnerName}!`;
    }
    if (roomState.motivoVitoria === 'CARTAS_INIMIGO') {
      return `A última carta do ${winnerName} foi revelada pelo adversário!`;
    }
    return `Todos os agentes do ${winnerName} foram localizados com sucesso!`;
  };

  /**
   * Banner super claro de Identidade e Papel do Jogador na Partida
   */
  const renderMyRoleBanner = () => {
    const teamLabel = roomState.meuTime === 'azul' ? 'TIME AZUL' : 'TIME VERMELHO';
    const teamBadgeClass =
      roomState.meuTime === 'azul'
        ? 'bg-blue-500 text-white'
        : 'bg-rose-500 text-white';

    if (roomState.meuPapel === 'capitao') {
      return (
        <div
          className={`rounded-xl border-2 px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 transition-all ${
            isCaptainOfCurrentTurn
              ? 'bg-purple-950/90 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
              : 'bg-purple-950/50 border-purple-500/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/25 border border-purple-400/50 text-purple-200 shrink-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-extrabold uppercase tracking-wider text-xs sm:text-sm text-purple-200">
                  VOCÊ É O CAPITÃO
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${teamBadgeClass}`}
                >
                  {teamLabel}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-100/90 leading-snug mt-0.5">
                {isCaptainOfCurrentTurn
                  ? '⚡ SUA VEZ! Digite 1 palavra de dica abaixo para guiar seu time.'
                  : 'Você vê as cores secretas de todas as cartas! Não dê dicas fora do seu turno.'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (roomState.meuPapel === 'portaVoz') {
      return (
        <div
          className={`rounded-xl border-2 px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 transition-all ${
            isSpokespersonOfCurrentTurn
              ? 'bg-emerald-950/90 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
              : 'bg-emerald-950/45 border-emerald-500/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 shrink-0">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-extrabold uppercase tracking-wider text-xs sm:text-sm text-emerald-200">
                  VOCÊ É O PORTA-VOZ DESTE TURNO
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${teamBadgeClass}`}
                >
                  {teamLabel}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-snug mt-0.5">
                {isSpokespersonOfCurrentTurn
                  ? '👆 É COM VOCÊ! Converse com seu time, toque na carta escolhida e confirme o palpite!'
                  : `Neste turno do seu time, é você quem clica nas cartas! (Capitão: ${myTeamCaptain?.nickname ?? '—'})`}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Papel: AGENTE
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-600 text-cyan-300 shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-extrabold uppercase tracking-wider text-xs sm:text-sm text-white">
                VOCÊ É AGENTE DE CAMPO
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${teamBadgeClass}`}
              >
                {teamLabel}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-snug mt-0.5">
              Debata a dica com seu time! Quem clica nas cartas neste turno é o Porta-voz{' '}
              <strong className="text-emerald-300">
                {myTeamSpokesperson?.nickname ?? '—'}
              </strong>
              .
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCard = (card: CardDTO) => {
    const isCaptainView = roomState.meuPapel === 'capitao' && !isGameOver;
    const canClick = isSpokespersonOfCurrentTurn && !card.revelada;
    const isSelected = card.destacada && !card.revelada;

    // Estilos base das cartas 5x5 otimizados para celulares (320px+) e telas grandes
    let containerClasses =
      'relative select-none rounded-lg sm:rounded-xl border-2 border-b-4 px-1 py-1.5 sm:p-2.5 min-h-[54px] sm:min-h-[82px] flex flex-col items-center justify-center text-center transition-all duration-150 overflow-hidden ';

    let badgeElement: React.ReactNode = null;

    if (card.revelada) {
      // CARTA REVELADA
      if (card.cor === 'azul') {
        containerClasses +=
          'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(37,99,235,0.35)] ';
      } else if (card.cor === 'vermelho') {
        containerClasses +=
          'bg-rose-600 border-rose-400 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)] ';
      } else if (card.cor === 'neutro') {
        containerClasses +=
          'bg-slate-600/60 border-slate-500 text-slate-300 opacity-80 ';
      } else if (card.cor === 'assassino') {
        containerClasses +=
          'bg-zinc-950 border-red-500 text-red-400 assassin-pulse ';
      }

      if (isCaptainView) {
        containerClasses += 'opacity-45 saturate-50 ';
      }
    } else {
      // CARTA OCULTA (NÃO REVELADA)
      if (isCaptainView || isGameOver) {
        if (card.cor === 'azul') {
          containerClasses +=
            'bg-slate-900 border-blue-400 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.4),inset_0_0_8px_rgba(59,130,246,0.2)] ';
          badgeElement = (
            <span className="absolute top-0.5 right-0.5 px-1 rounded text-[7px] sm:text-[10px] font-mono font-bold bg-blue-500 text-white leading-tight">
              AZUL
            </span>
          );
        } else if (card.cor === 'vermelho') {
          containerClasses +=
            'bg-slate-900 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.4),inset_0_0_8px_rgba(244,63,94,0.2)] ';
          badgeElement = (
            <span className="absolute top-0.5 right-0.5 px-1 rounded text-[7px] sm:text-[10px] font-mono font-bold bg-rose-500 text-white leading-tight">
              VERM
            </span>
          );
        } else if (card.cor === 'neutro') {
          containerClasses +=
            'bg-slate-900/90 border-slate-600 text-slate-300 ';
          badgeElement = (
            <span className="absolute top-0.5 right-0.5 px-1 rounded text-[7px] sm:text-[9px] font-mono bg-slate-700 text-slate-300 leading-tight">
              CIVIL
            </span>
          );
        } else if (card.cor === 'assassino') {
          containerClasses +=
            'bg-zinc-950 border-red-500 text-red-300 assassin-pulse ';
          badgeElement = (
            <span className="absolute top-0.5 right-0.5 px-1 rounded text-[7px] sm:text-[10px] font-mono font-bold bg-red-600 text-white flex items-center gap-0.5 leading-tight">
              <Skull className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> MORTE
            </span>
          );
        }
      } else {
        containerClasses +=
          'bg-[#e8dfca] border-[#b8ab90] text-slate-900 shadow-inner ';
      }

      if (canClick) {
        containerClasses +=
          'cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 ';
      } else {
        containerClasses += 'cursor-default ';
      }

      if (isSelected) {
        containerClasses +=
          '!border-amber-400 !ring-2 sm:!ring-4 !ring-amber-400/60 -translate-y-0.5 ';
      }
    }

    // Escala responsiva da fonte conforme o comprimento da palavra para caber 5 colunas no celular
    const wordLen = card.palavra.length;
    const wordTextSize =
      wordLen >= 12
        ? 'text-[8px] sm:text-xs md:text-sm tracking-normal'
        : wordLen >= 9
        ? 'text-[9px] sm:text-xs md:text-sm tracking-tight sm:tracking-wider'
        : wordLen >= 7
        ? 'text-[10px] sm:text-sm md:text-base tracking-tight sm:tracking-wider'
        : 'text-[11px] sm:text-base tracking-wider';

    return (
      <button
        key={card.index}
        type="button"
        disabled={!canClick}
        onClick={() => {
          if (canClick) {
            onPointCard(card.index);
          }
        }}
        className={containerClasses}
      >
        {badgeElement}

        {card.revelada && card.cor === 'assassino' && (
          <Skull className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-400 mb-0.5 animate-bounce" />
        )}

        <span
          className={`uppercase font-extrabold leading-tight break-all sm:break-words max-w-full px-0.5 ${wordTextSize} ${
            card.revelada && isCaptainView ? 'line-through' : ''
          }`}
        >
          {card.palavra}
        </span>

        {isSelected && (
          <span className="mt-0.5 px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-mono font-extrabold text-[7px] sm:text-[10px] uppercase tracking-wider shadow">
            ALVO
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-[100dvh] max-w-5xl mx-auto px-1.5 sm:px-5 py-2 sm:py-4 flex flex-col justify-between gap-2 sm:gap-3.5">
      {/* HUD SUPERIOR COMPACTO E RESPONSIVO */}
      <header className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 sm:p-3.5 shadow-2xl space-y-2">
        {/* Linha 1: Placar Azul + Turno + Placar Vermelho + Botões */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Placar Time Azul */}
          <div
            className={`flex items-center px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl border-2 transition-all shrink-0 ${
              roomState.turnoAtual === 'azul' && !isGameOver
                ? 'bg-blue-600/25 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                : 'bg-slate-950/80 border-blue-900/50 opacity-80'
            }`}
          >
            <div className="text-left">
              <div className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider text-blue-300">
                AZUL
              </div>
              <div className="text-lg sm:text-3xl font-mono font-extrabold text-blue-400 leading-none">
                {roomState.cartasRestantes.azul}
              </div>
            </div>
          </div>

          {/* Indicador Central de Turno e Sala */}
          <div className="flex flex-col items-center text-center min-w-0 px-1">
            <div className="flex items-center gap-1 text-[9px] sm:text-xs font-mono text-slate-400">
              <span>SALA</span>
              <strong className="text-cyan-300 tracking-widest">{roomState.roomCode}</strong>
              <span className="hidden sm:inline">• JOGO #{roomState.partidaNumero}</span>
            </div>

            {!isGameOver ? (
              <div
                className={`mt-0.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-mono font-extrabold uppercase tracking-wider border truncate max-w-full ${
                  roomState.turnoAtual === 'azul'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/50'
                }`}
              >
                VEZ DO TIME {roomState.turnoAtual.toUpperCase()}
              </div>
            ) : (
              <div className="mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/50">
                FIM DE JOGO
              </div>
            )}
          </div>

          {/* Placar Time Vermelho + Botões Rápidos */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div
              className={`flex items-center px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl border-2 transition-all ${
                roomState.turnoAtual === 'vermelho' && !isGameOver
                  ? 'bg-rose-600/25 border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.35)]'
                  : 'bg-slate-950/80 border-rose-900/50 opacity-80'
              }`}
            >
              <div className="text-right">
                <div className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider text-rose-300">
                  VERM
                </div>
                <div className="text-lg sm:text-3xl font-mono font-extrabold text-rose-400 leading-none">
                  {roomState.cartasRestantes.vermelho}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              title="QR Code e Link da Sala"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              title="Equipes e Histórico"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              title="Sair da Sala"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Linha 2: BANNER EM DESTAQUE DO SEU PAPEL */}
        {renderMyRoleBanner()}

        {/* Linha 3: Dica Ativa + Quem é o Capitão e Porta-voz da Vez */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2 pt-1">
          {/* Dica Ativa */}
          <div className="sm:col-span-7 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 sm:py-2 flex items-center justify-between">
            {roomState.dicaAtual ? (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="truncate">
                  <span className="text-[9px] font-mono uppercase text-slate-400 block">
                    DICA DO CAPITÃO {roomState.dicaAtual.autorNickname}
                  </span>
                  <span className="font-mono font-extrabold text-xs sm:text-base text-cyan-300 tracking-wider uppercase">
                    DICA: {roomState.dicaAtual.palavra} — {roomState.dicaAtual.numero}
                  </span>
                </div>
                <span className="shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 font-mono text-[11px] sm:text-xs font-bold text-cyan-300">
                  {roomState.palpitesRestantes} restante(s)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-amber-300/90 py-0.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="truncate">
                  {isGameOver
                    ? 'Fim de jogo — Todas as cartas reveladas'
                    : `Aguardando dica do Capitão ${currentTurnCaptain?.nickname ?? ''}...`}
                </span>
              </div>
            )}
          </div>

          {/* Capitão da Vez & Porta-voz da Vez */}
          <div className="sm:col-span-5 flex items-center justify-around bg-slate-950/70 border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-xs">
            <div className="truncate pr-2">
              <span className="text-[9px] font-mono uppercase text-slate-400 block">
                CAPITÃO DA VEZ
              </span>
              <span className="font-bold text-purple-300 truncate block text-[11px] sm:text-xs">
                {currentTurnCaptain?.nickname ?? '—'}
              </span>
            </div>
            <div className="h-5 w-px bg-slate-800" />
            <div className="truncate pl-2">
              <span className="text-[9px] font-mono uppercase text-slate-400 block">
                PORTA-VOZ DA VEZ
              </span>
              <span className="font-bold text-emerald-300 truncate block text-[11px] sm:text-xs">
                {currentTurnSpokesperson?.nickname ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* BANNER DE FIM DE JOGO (QUANDO fase === 'FIM') */}
      {isGameOver && roomState.vencedor && (
        <div
          className={`rounded-2xl border-2 p-3.5 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3.5 ${
            roomState.vencedor === 'azul'
              ? 'bg-blue-950/85 border-blue-400 text-blue-100'
              : 'bg-rose-950/85 border-rose-400 text-rose-100'
          }`}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div
              className={`p-2.5 sm:p-3 rounded-2xl shrink-0 hidden sm:block ${
                roomState.vencedor === 'azul' ? 'bg-blue-500/30' : 'bg-rose-500/30'
              }`}
            >
              <Trophy className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-amber-300 font-bold">
                FIM DE OPERAÇÃO // VITÓRIA CONFIRMADA
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold uppercase tracking-wide text-white">
                VITÓRIA DO {BRANDING.teams[roomState.vencedor].name}!
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 mt-0.5">{getWinReasonText()}</p>
            </div>
          </div>

          {isHost ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={onNextMatch}
                className="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-slate-950 font-extrabold uppercase tracking-wider text-xs border-b-4 border-emerald-700 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Próxima Partida (Rotacionar Capitães)</span>
              </button>
              <button
                type="button"
                onClick={onBackToLobby}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-white font-bold uppercase tracking-wider text-xs border border-slate-600 border-b-4 flex items-center justify-center gap-2 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Voltar ao Lobby</span>
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono text-amber-200 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-700">
              Aguardando o Host iniciar a próxima partida...
            </div>
          )}
        </div>
      )}

      {/* TABULEIRO 5x5 */}
      <main className="my-auto">
        <div className="grid grid-cols-5 gap-1 sm:gap-2.5 md:gap-3">
          {roomState.tabuleiro.map((card) => renderCard(card))}
        </div>
      </main>

      {/* BARRA DE AÇÃO INFERIOR (FIXA NO RODAPÉ EM CELULARES QUANDO ATIVA) */}
      {!isGameOver && (
        <footer className="sticky bottom-1.5 z-30 bg-slate-900/95 backdrop-blur-md border-2 border-slate-700 rounded-2xl p-2.5 sm:p-4 shadow-2xl">
          {/* FASE 1: Formulário do Capitão da Vez */}
          {isCaptainOfCurrentTurn && (
            <form
              onSubmit={handleClueSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <input
                type="text"
                value={clueWord}
                onChange={(e) => setClueWord(e.target.value.replace(/\s+/g, '').toUpperCase())}
                placeholder="DIGITE 1 PALAVRA DE DICA"
                maxLength={24}
                className="flex-grow px-3.5 py-2.5 rounded-xl bg-slate-950 border-2 border-purple-500/60 focus:border-purple-400 focus:outline-none text-white font-mono font-extrabold uppercase tracking-wider text-base sm:text-sm"
              />

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 border-2 border-slate-700 rounded-xl px-2.5 py-2">
                  <span className="text-[10px] font-mono text-slate-400 mr-1.5 uppercase">
                    Nº:
                  </span>
                  <select
                    value={clueNumber}
                    onChange={(e) => setClueNumber(Number(e.target.value))}
                    className="bg-transparent text-cyan-300 font-mono font-extrabold text-base focus:outline-none pr-1"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={n} className="bg-slate-900 text-white">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="flex-grow sm:flex-grow-0 px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 active:translate-y-0.5 text-slate-950 font-extrabold uppercase tracking-wider text-xs sm:text-sm border-b-4 border-purple-700 flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Dica</span>
                </button>
              </div>
            </form>
          )}

          {/* FASE 2: Controles do Porta-voz da Vez (Two-Step Confirm + Encerrar Turno) */}
          {isSpokespersonOfCurrentTurn && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
                <Megaphone className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {pointedCard
                    ? `Alvo selecionado: [${pointedCard.palavra}]`
                    : 'Toque em uma carta fechada para selecionar o palpite.'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {pointedCard && (
                  <button
                    type="button"
                    onClick={() => onRevealCard(pointedCard.index)}
                    className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-extrabold uppercase tracking-wider text-xs sm:text-sm border-b-4 border-amber-600 flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Confirmar Palpite: {pointedCard.palavra}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onPassTurn}
                  className="px-4 py-2.5 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-slate-200 font-bold uppercase tracking-wider text-xs border border-slate-600 border-b-4 flex items-center justify-center gap-1.5 transition-all"
                >
                  <SkipForward className="w-4 h-4 text-cyan-400" />
                  <span>Encerrar Turno</span>
                </button>
              </div>
            </div>
          )}

          {/* Visão de espera para os demais jogadores */}
          {!isCaptainOfCurrentTurn && !isSpokespersonOfCurrentTurn && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs font-mono text-slate-300 py-0.5 text-center sm:text-left">
              {roomState.aguardandoDica ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span>
                    Aguardando dica do Capitão{' '}
                    <strong className="text-white">
                      {currentTurnCaptain?.nickname ?? '...'}
                    </strong>{' '}
                    ({BRANDING.teams[roomState.turnoAtual].shortName})...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span>
                    Porta-voz{' '}
                    <strong className="text-emerald-300">
                      {currentTurnSpokesperson?.nickname ?? '...'}
                    </strong>{' '}
                    está escolhendo
                    {pointedCard ? ` -> [${pointedCard.palavra}]` : '...'}
                  </span>
                </div>
              )}
            </div>
          )}
        </footer>
      )}

      {/* MODAL DE QR CODE / CONVITE */}
      {showQrModal && (
        <ShareRoomModal
          roomCode={roomState.roomCode}
          lanUrl={roomState.lanUrl}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* MODAL DE HISTÓRICO TÁTICO & FILA CIRCULAR */}
      {showLogModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLogModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[82vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-cyan-400">
                <History className="w-4 h-4" />
                <span>Equipes, Papéis & Histórico</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-5 text-xs">
              {/* Filas e Papéis Atuais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['azul', 'vermelho'] as const).map((team) => {
                  const teamPlayers = roomState.jogadores.filter((j) => j.team === team);
                  return (
                    <div
                      key={team}
                      className={`p-3 rounded-xl border ${
                        team === 'azul'
                          ? 'bg-blue-950/20 border-blue-500/30'
                          : 'bg-rose-950/20 border-rose-500/30'
                      }`}
                    >
                      <div
                        className={`font-extrabold uppercase mb-2 ${
                          team === 'azul' ? 'text-blue-400' : 'text-rose-400'
                        }`}
                      >
                        {BRANDING.teams[team].name}
                      </div>
                      <ul className="space-y-1.5">
                        {teamPlayers.map((p) => (
                          <li
                            key={p.playerId}
                            className="flex items-center justify-between gap-1 text-slate-200"
                          >
                            <span className="truncate flex items-center gap-1 font-bold">
                              {p.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                              {p.nickname}
                              {p.playerId === roomState.meuPlayerId && (
                                <span className="text-[9px] text-cyan-300 font-mono">(VOCÊ)</span>
                              )}
                            </span>
                            <span
                              className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded shrink-0 font-bold ${
                                p.role === 'capitao'
                                  ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40'
                                  : p.role === 'portaVoz'
                                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                                  : 'bg-slate-950 text-slate-300'
                              }`}
                            >
                              {p.role === 'capitao'
                                ? 'CAPITÃO'
                                : p.role === 'portaVoz'
                                ? 'PORTA-VOZ'
                                : 'AGENTE'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Log de Eventos */}
              <div>
                <h3 className="font-mono uppercase text-slate-400 mb-2">
                  Registro de Transmissões
                </h3>
                <div className="space-y-1.5">
                  {roomState.historico.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 font-mono text-[11px]"
                    >
                      {entry.mensagem}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
