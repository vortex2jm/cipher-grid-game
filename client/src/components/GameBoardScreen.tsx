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
          ? ['#2563EB', '#60A5FA', '#FACC15']
          : ['#E11D48', '#FB7185', '#FACC15'];

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
   * Banner tátil de Identidade e Papel do Jogador na Partida
   */
  const renderMyRoleBanner = () => {
    const teamLabel = roomState.meuTime === 'azul' ? 'TIME AZUL' : 'TIME VERMELHO';
    const teamBadgeClass =
      roomState.meuTime === 'azul'
        ? 'bg-[#2563EB] text-white border border-zinc-900'
        : 'bg-[#E11D48] text-white border border-zinc-900';

    if (roomState.meuPapel === 'capitao') {
      return (
        <div
          className={`rounded-xl border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 transition-all ${
            isCaptainOfCurrentTurn ? 'bg-[#FACC15] text-zinc-900' : 'bg-[#F3EFE6] text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white border-2 border-zinc-900 text-zinc-900 shrink-0">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm text-zinc-900">
                  VOCÊ É O CAPITÃO
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${teamBadgeClass}`}
                >
                  {teamLabel}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-800 font-medium leading-snug mt-0.5">
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
          className={`rounded-xl border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 transition-all ${
            isSpokespersonOfCurrentTurn
              ? 'bg-[#FACC15] text-zinc-900'
              : 'bg-[#F3EFE6] text-zinc-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white border-2 border-zinc-900 text-zinc-900 shrink-0">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm text-zinc-900">
                  VOCÊ É O PORTA-VOZ DESTE TURNO
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${teamBadgeClass}`}
                >
                  {teamLabel}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-800 font-medium leading-snug mt-0.5">
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
      <div className="rounded-xl border-2 border-zinc-900 bg-[#F3EFE6] shadow-[0_3px_0_0_#18181b] px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white border-2 border-zinc-900 text-zinc-900 shrink-0">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm text-zinc-900">
                VOCÊ É AGENTE DE CAMPO
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${teamBadgeClass}`}
              >
                {teamLabel}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-700 font-medium leading-snug mt-0.5">
              Debata a dica com seu time! Quem clica nas cartas neste turno é o Porta-voz{' '}
              <strong className="text-zinc-900 underline decoration-2 decoration-[#4ADE80]">
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
    const showKeyOverlay = isCaptainView || isGameOver;

    let containerClasses =
      'relative select-none rounded-xl border-2 px-1 py-1.5 sm:p-2.5 min-h-[56px] sm:min-h-[84px] flex flex-col items-center justify-center text-center transition-all duration-150 overflow-hidden shadow-[0_4px_0_0_#18181b] ';

    let innerFrameClass = 'border-zinc-900/10';
    let topStripElement: React.ReactNode = null;
    let badgeElement: React.ReactNode = null;

    if (card.revelada) {
      containerClasses += 'card-revealed-anim ';

      if (card.cor === 'azul') {
        containerClasses += 'bg-[#2563EB] border-[#1E3A8A] text-white ';
        innerFrameClass = 'border-white/25';
      } else if (card.cor === 'vermelho') {
        containerClasses += 'bg-[#E11D48] border-[#881337] text-white ';
        innerFrameClass = 'border-white/25';
      } else if (card.cor === 'neutro') {
        containerClasses += 'bg-[#D6CFC2] border-zinc-900 text-[#57534E] ';
        innerFrameClass = 'border-zinc-900/15';
      } else if (card.cor === 'assassino') {
        containerClasses += 'bg-[#18181B] border-zinc-900 text-[#FACC15] assassin-pulse ';
        innerFrameClass = 'border-[#FACC15]/30';
      }

      if (isCaptainView) {
        containerClasses += 'opacity-55 ';
      }
    } else {
      // CARTA OCULTA (NÃO REVELADA)
      containerClasses += isSelected
        ? 'bg-[#FEF08A] border-zinc-900 text-zinc-900 ring-2 ring-zinc-900 -translate-y-0.5 '
        : 'bg-[#FFFDF9] border-zinc-900 text-zinc-900 ';

      if (showKeyOverlay) {
        containerClasses += 'pt-3 sm:pt-4 ';

        if (card.cor === 'azul') {
          topStripElement = (
            <span
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-2 sm:h-2.5 bg-[#2563EB] border-b border-zinc-900"
            />
          );
          badgeElement = (
            <span className="absolute top-2.5 sm:top-3 right-1 px-1 py-0.5 rounded text-[7px] sm:text-[9px] font-mono font-extrabold bg-[#2563EB] text-white border border-zinc-900 leading-none">
              AZUL
            </span>
          );
        } else if (card.cor === 'vermelho') {
          topStripElement = (
            <span
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-2 sm:h-2.5 bg-[#E11D48] border-b border-zinc-900"
            />
          );
          badgeElement = (
            <span className="absolute top-2.5 sm:top-3 right-1 px-1 py-0.5 rounded text-[7px] sm:text-[9px] font-mono font-extrabold bg-[#E11D48] text-white border border-zinc-900 leading-none">
              VERM
            </span>
          );
        } else if (card.cor === 'neutro') {
          topStripElement = (
            <span
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-2 sm:h-2.5 bg-[#D6CFC2] border-b border-zinc-900"
            />
          );
          badgeElement = (
            <span className="absolute top-2.5 sm:top-3 right-1 px-1 py-0.5 rounded text-[7px] sm:text-[9px] font-mono font-bold bg-[#D6CFC2] text-[#57534E] border border-zinc-900 leading-none">
              CIVIL
            </span>
          );
        } else if (card.cor === 'assassino') {
          topStripElement = (
            <span
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-2 sm:h-2.5 bg-[#18181B] border-b border-zinc-900"
            />
          );
          badgeElement = (
            <span className="absolute top-2.5 sm:top-3 right-1 px-1 py-0.5 rounded text-[7px] sm:text-[9px] font-mono font-extrabold bg-[#18181B] text-[#FACC15] border border-zinc-900 flex items-center gap-0.5 leading-none">
              <Skull className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              <span className="hidden sm:inline">MORTE</span>
            </span>
          );
        }
      }

      if (canClick) {
        containerClasses +=
          'cursor-pointer hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none ';
      } else {
        containerClasses += 'cursor-default ';
      }
    }

    // Escala responsiva da fonte conforme o comprimento da palavra para caber 5 colunas no celular
    const wordLen = card.palavra.length;
    const wordTextSize =
      wordLen >= 12
        ? 'text-[8px] sm:text-xs md:text-sm tracking-normal'
        : wordLen >= 9
        ? 'text-[9px] sm:text-xs md:text-sm tracking-tight sm:tracking-wide'
        : wordLen >= 7
        ? 'text-[10px] sm:text-sm md:text-base tracking-tight sm:tracking-wide'
        : 'text-[11px] sm:text-base tracking-wide';

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
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-1 rounded-lg border ${innerFrameClass}`}
        />
        {topStripElement}
        {badgeElement}

        {card.revelada && card.cor === 'assassino' && (
          <Skull className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#FACC15] mb-0.5" />
        )}

        <span
          className={`relative z-10 font-display uppercase font-extrabold leading-tight break-all sm:break-words max-w-full px-0.5 ${wordTextSize} ${
            card.revelada && isCaptainView ? 'line-through' : ''
          }`}
        >
          {card.palavra}
        </span>

        {isSelected && (
          <span className="relative z-10 mt-0.5 px-1.5 py-0.5 rounded bg-[#FACC15] border border-zinc-900 text-zinc-900 font-mono font-extrabold text-[7px] sm:text-[10px] uppercase tracking-wider">
            ALVO
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-[100dvh] max-w-5xl mx-auto px-1.5 sm:px-5 py-2 sm:py-4 flex flex-col justify-between gap-2 sm:gap-3.5">
      {/* HUD SUPERIOR ESTILO PLACAR DE CAMPEONATO */}
      <header className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-2 sm:p-3.5 shadow-[0_4px_0_0_#18181b] space-y-2">
        {/* Linha 1: Placar Azul + Turno Inclinado + Placar Vermelho + Botões */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Placar Time Azul */}
          <div
            className={`flex items-center px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-xl bg-[#2563EB] border-2 border-[#1E3A8A] text-white shadow-[0_3px_0_0_#18181b] transition-all shrink-0 ${
              roomState.turnoAtual === 'azul' && !isGameOver
                ? 'ring-2 ring-zinc-900'
                : 'opacity-75'
            }`}
          >
            <div className="text-left">
              <div className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-blue-100">
                AZUL
              </div>
              <div className="text-lg sm:text-3xl font-mono font-extrabold text-white leading-none">
                {roomState.cartasRestantes.azul}
              </div>
            </div>
          </div>

          {/* Indicador Central de Turno (Badge inclinado) e Sala */}
          <div className="flex flex-col items-center text-center min-w-0 px-1">
            <div className="flex items-center gap-1 text-[9px] sm:text-xs font-mono font-bold text-zinc-600">
              <span>SALA</span>
              <strong className="text-zinc-900 tracking-widest">{roomState.roomCode}</strong>
              <span className="hidden sm:inline">• JOGO #{roomState.partidaNumero}</span>
            </div>

            {!isGameOver ? (
              <div
                className={`mt-1 -rotate-2 px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-lg border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] text-[10px] sm:text-xs font-mono font-extrabold uppercase tracking-wider truncate max-w-full ${
                  roomState.turnoAtual === 'azul'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#E11D48] text-white'
                }`}
              >
                VEZ DO TIME {roomState.turnoAtual.toUpperCase()}
              </div>
            ) : (
              <div className="mt-1 -rotate-2 px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-lg border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] text-[10px] sm:text-xs font-mono font-extrabold uppercase tracking-wider bg-[#FACC15] text-zinc-900">
                FIM DE JOGO
              </div>
            )}
          </div>

          {/* Placar Time Vermelho + Botões Rápidos */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div
              className={`flex items-center px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-xl bg-[#E11D48] border-2 border-[#881337] text-white shadow-[0_3px_0_0_#18181b] transition-all ${
                roomState.turnoAtual === 'vermelho' && !isGameOver
                  ? 'ring-2 ring-zinc-900'
                  : 'opacity-75'
              }`}
            >
              <div className="text-right">
                <div className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-rose-100">
                  VERM
                </div>
                <div className="text-lg sm:text-3xl font-mono font-extrabold text-white leading-none">
                  {roomState.cartasRestantes.vermelho}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              title="QR Code e Link da Sala"
              className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[2px] active:shadow-none text-zinc-900 border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] transition-all"
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              title="Equipes e Histórico"
              className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[2px] active:shadow-none text-zinc-900 border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] transition-all"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              title="Sair da Sala"
              className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-[#E11D48] hover:text-white active:translate-y-[2px] active:shadow-none text-zinc-900 border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] transition-all"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Linha 2: BANNER EM DESTAQUE DO SEU PAPEL */}
        {renderMyRoleBanner()}

        {/* Linha 3: Dica Ativa + Quem é o Capitão e Porta-voz da Vez */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2 pt-0.5">
          {/* Dica Ativa */}
          <div className="sm:col-span-7 bg-[#F3EFE6] border-2 border-zinc-900 rounded-xl px-3 py-1.5 sm:py-2 flex items-center justify-between">
            {roomState.dicaAtual ? (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="truncate">
                  <span className="text-[9px] font-mono font-bold uppercase text-zinc-600 block">
                    DICA DO CAPITÃO {roomState.dicaAtual.autorNickname}
                  </span>
                  <span className="font-mono font-extrabold text-xs sm:text-base text-zinc-900 tracking-wider uppercase">
                    DICA: {roomState.dicaAtual.palavra} — {roomState.dicaAtual.numero}
                  </span>
                </div>
                <span className="shrink-0 px-2.5 py-0.5 sm:py-1 rounded-lg bg-[#FACC15] border-2 border-zinc-900 font-mono text-[11px] sm:text-xs font-extrabold text-zinc-900">
                  {roomState.palpitesRestantes} restante(s)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono font-bold text-zinc-800 py-0.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin shrink-0 text-zinc-900" />
                <span className="truncate">
                  {isGameOver
                    ? 'Fim de jogo — Todas as cartas reveladas'
                    : `Aguardando dica do Capitão ${currentTurnCaptain?.nickname ?? ''}...`}
                </span>
              </div>
            )}
          </div>

          {/* Capitão da Vez & Porta-voz da Vez */}
          <div className="sm:col-span-5 flex items-center justify-around bg-[#FFFDF9] border-2 border-zinc-900 rounded-xl px-2.5 py-1.5 text-xs">
            <div className="truncate pr-2">
              <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 block">
                CAPITÃO DA VEZ
              </span>
              <span className="font-bold text-zinc-900 truncate block text-[11px] sm:text-xs">
                {currentTurnCaptain?.nickname ?? '—'}
              </span>
            </div>
            <div className="h-5 w-0.5 bg-zinc-900/20" />
            <div className="truncate pl-2">
              <span className="text-[9px] font-mono font-bold uppercase text-zinc-500 block">
                PORTA-VOZ DA VEZ
              </span>
              <span className="font-bold text-zinc-900 truncate block text-[11px] sm:text-xs">
                {currentTurnSpokesperson?.nickname ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* BANNER DE FIM DE JOGO (QUANDO fase === 'FIM') */}
      {isGameOver && roomState.vencedor && (
        <div className="rounded-2xl border-2 border-zinc-900 bg-[#FFFDF9] p-3.5 sm:p-5 shadow-[0_6px_0_0_#18181b] flex flex-col sm:flex-row items-center justify-between gap-3.5">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="p-2.5 sm:p-3 rounded-2xl shrink-0 hidden sm:flex bg-[#FACC15] border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b]">
              <Trophy className="w-7 h-7 text-zinc-900" />
            </div>
            <div>
              <div className="inline-block px-2 py-0.5 rounded bg-[#FACC15] border border-zinc-900 text-[10px] font-mono uppercase tracking-widest text-zinc-900 font-extrabold mb-1">
                FIM DE OPERAÇÃO // VITÓRIA CONFIRMADA
              </div>
              <h2
                className={`font-display text-lg sm:text-2xl font-extrabold uppercase tracking-tight ${
                  roomState.vencedor === 'azul' ? 'text-[#2563EB]' : 'text-[#E11D48]'
                }`}
              >
                VITÓRIA DO {BRANDING.teams[roomState.vencedor].name}!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-700 font-medium mt-0.5">
                {getWinReasonText()}
              </p>
            </div>
          </div>

          {isHost ? (
            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={onNextMatch}
                className="min-h-[48px] px-4 py-3 rounded-xl bg-[#4ADE80] hover:bg-[#86EFAC] active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Próxima Partida (Rotacionar Capitães)</span>
              </button>
              <button
                type="button"
                onClick={onBackToLobby}
                className="min-h-[48px] px-4 py-3 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-bold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Voltar ao Lobby</span>
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono font-bold text-zinc-900 bg-[#FACC15] px-3.5 py-2 rounded-xl border-2 border-zinc-900">
              Aguardando o Host iniciar a próxima partida...
            </div>
          )}
        </div>
      )}

      {/* TABULEIRO 5x5 */}
      <main className="my-auto">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 md:gap-3">
          {roomState.tabuleiro.map((card) => renderCard(card))}
        </div>
      </main>

      {/* BARRA DE AÇÃO INFERIOR (FIXA NO RODAPÉ EM CELULARES QUANDO ATIVA) */}
      {!isGameOver && (
        <footer className="sticky bottom-1.5 z-30 bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-2.5 sm:p-4 shadow-[0_6px_0_0_#18181b]">
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
                className="flex-grow min-h-[48px] px-3.5 py-2.5 rounded-xl bg-white border-2 border-zinc-900 focus:outline-none focus:bg-[#FFFBEB] focus:shadow-[0_3px_0_0_#18181b] text-zinc-900 placeholder:text-zinc-400 font-mono font-extrabold uppercase tracking-wider text-base sm:text-sm transition-all"
              />

              <div className="flex items-center gap-2">
                <div className="min-h-[48px] flex items-center bg-white border-2 border-zinc-900 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-mono font-bold text-zinc-600 mr-1.5 uppercase">
                    Nº:
                  </span>
                  <select
                    value={clueNumber}
                    onChange={(e) => setClueNumber(Number(e.target.value))}
                    className="bg-transparent text-zinc-900 font-mono font-extrabold text-base focus:outline-none pr-1"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={n} className="bg-white text-zinc-900">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="min-h-[48px] flex-grow sm:flex-grow-0 px-5 py-3 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
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
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-900">
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
                    className="min-h-[48px] px-4 py-3 rounded-xl bg-[#4ADE80] hover:bg-[#86EFAC] active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Confirmar Palpite: {pointedCard.palavra}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onPassTurn}
                  className="min-h-[48px] px-4 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-bold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-1.5 transition-all"
                >
                  <SkipForward className="w-4 h-4 text-zinc-900" />
                  <span>Encerrar Turno</span>
                </button>
              </div>
            </div>
          )}

          {/* Visão de espera para os demais jogadores */}
          {!isCaptainOfCurrentTurn && !isSpokespersonOfCurrentTurn && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs font-mono font-bold text-zinc-700 py-1 text-center sm:text-left">
              {roomState.aguardandoDica ? (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15] border border-zinc-900 animate-ping shrink-0" />
                  <span>
                    Aguardando dica do Capitão{' '}
                    <strong className="text-zinc-900">
                      {currentTurnCaptain?.nickname ?? '...'}
                    </strong>{' '}
                    ({BRANDING.teams[roomState.turnoAtual].shortName})...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] border border-zinc-900 animate-pulse shrink-0" />
                  <span>
                    Porta-voz{' '}
                    <strong className="text-zinc-900">
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
          className="fixed inset-0 z-50 bg-zinc-900/60 flex items-center justify-center p-4"
          onClick={() => setShowLogModal(false)}
        >
          <div
            className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl max-w-lg w-full max-h-[82vh] flex flex-col shadow-[0_6px_0_0_#18181b] overflow-hidden text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b-2 border-zinc-900/15 bg-[#F3EFE6]">
              <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-zinc-900">
                <History className="w-4 h-4" />
                <span>Equipes, Papéis & Histórico</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-2 rounded-lg bg-white hover:bg-zinc-100 active:translate-y-[2px] active:shadow-none border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b] text-zinc-900 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-5 text-xs">
              {/* Filas e Papéis Atuais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['azul', 'vermelho'] as const).map((team) => {
                  const teamPlayers = roomState.jogadores.filter((j) => j.team === team);
                  const isBlue = team === 'azul';
                  return (
                    <div
                      key={team}
                      className="rounded-xl border-2 border-zinc-900 bg-[#F3EFE6] overflow-hidden shadow-[0_3px_0_0_#18181b]"
                    >
                      <div
                        className={`px-3 py-2 border-b-2 border-zinc-900 font-display font-extrabold uppercase text-white ${
                          isBlue ? 'bg-[#2563EB]' : 'bg-[#E11D48]'
                        }`}
                      >
                        {BRANDING.teams[team].name}
                      </div>
                      <ul className="p-3 space-y-2">
                        {teamPlayers.map((p) => (
                          <li
                            key={p.playerId}
                            className="flex items-center justify-between gap-1 text-zinc-900"
                          >
                            <span className="truncate flex items-center gap-1 font-bold">
                              {p.isHost && (
                                <Crown className="w-3.5 h-3.5 text-zinc-900 fill-[#FACC15] shrink-0" />
                              )}
                              {p.nickname}
                              {p.playerId === roomState.meuPlayerId && (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-900 text-[#FACC15] font-mono">
                                  VOCÊ
                                </span>
                              )}
                            </span>
                            <span
                              className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded shrink-0 font-bold border border-zinc-900 ${
                                p.role === 'capitao'
                                  ? 'bg-zinc-900 text-white'
                                  : p.role === 'portaVoz'
                                  ? 'bg-[#4ADE80] text-zinc-900'
                                  : 'bg-white text-zinc-900'
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
                <h3 className="font-mono font-bold uppercase text-zinc-700 mb-2">
                  Registro de Transmissões
                </h3>
                <div className="space-y-1.5">
                  {roomState.historico.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-3 py-2 rounded-lg bg-white border-2 border-zinc-900 text-zinc-900 font-mono text-[11px] font-semibold"
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
