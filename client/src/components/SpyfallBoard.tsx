import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  Check,
  Clock,
  Crosshair,
  Eye,
  History,
  LogOut,
  MapPin,
  Mic,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Skull,
  Trophy,
  Users,
  Vote,
  X,
} from 'lucide-react';
import { BRANDING } from '../../../shared/branding';
import { RoomStateDTO, SpyfallWinReason } from '../../../shared/types';
import { ShareRoomModal } from './ShareRoomModal';

interface SpyfallBoardProps {
  roomState: RoomStateDTO;
  onCallVote: () => void;
  onCastVote: (suspeitoId: string) => void;
  onRiskLocation: () => void;
  onGuessLocation: (localEscolhido: string) => void;
  onNextMatch: () => void;
  onBackToLobby: () => void;
  onLeaveRoom: () => void;
}

function formatMsToClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getSpyfallWinReasonText(
  motivo: SpyfallWinReason | null,
  impostorName: string,
  local: string | null,
  palpite: string | null
): string {
  switch (motivo) {
    case 'VOTACAO_INOCENTE':
      return `O grupo acusou um Inocente na votação! ${impostorName} enganou todo mundo.`;
    case 'CARTADA_ACERTOU':
      return `${impostorName} foi descoberto, mas acertou o local ("${palpite ?? local}") na Cartada Final!`;
    case 'ARRISCOU_ACERTOU':
      return `${impostorName} arriscou o palpite antes do tempo acabar e cravou "${palpite ?? local}"!`;
    case 'CARTADA_ERROU':
      return `Os agentes desmascararam ${impostorName}! Ele chutou "${palpite ?? '?'}", mas o local era "${local ?? '?'}".`;
    case 'ARRISCOU_ERROU':
      return `${impostorName} arriscou "${palpite ?? '?'}" e errou! O local verdadeiro era "${local ?? '?'}".`;
    case 'CARTADA_TEMPO_ESGOTADO':
      return `Os 15 segundos da Cartada Final estouraram! Os agentes seguraram a vitória.`;
    default:
      return 'Rodada encerrada.';
  }
}

export const SpyfallBoard: React.FC<SpyfallBoardProps> = ({
  roomState,
  onCallVote,
  onCastVote,
  onRiskLocation,
  onGuessLocation,
  onNextMatch,
  onBackToLobby,
  onLeaveRoom,
}) => {
  const spy = roomState.spyfall;
  const [isIdentityRevealed, setIsIdentityRevealed] = useState(false);
  const [crossedLocations, setCrossedLocations] = useState<Record<string, boolean>>({});
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const [displayMainMs, setDisplayMainMs] = useState<number>(spy?.tempoRestanteMs ?? 0);
  const [displayCartadaMs, setDisplayCartadaMs] = useState<number>(
    spy?.tempoRestanteCartadaMs ?? 0
  );

  const mainDeadlineRef = useRef<number>(Date.now() + (spy?.tempoRestanteMs ?? 0));
  const cartadaDeadlineRef = useRef<number>(
    Date.now() + (spy?.tempoRestanteCartadaMs ?? 0)
  );

  const isHost = roomState.meuPlayerId === roomState.hostId;
  const isGameOver = roomState.fase === 'FIM';

  // Limpa riscados e esconde identidade a cada nova partida
  useEffect(() => {
    setCrossedLocations({});
    setIsIdentityRevealed(false);
  }, [roomState.partidaNumero]);

  // Sincroniza referências de deadline com os valores autoritativos do servidor
  useEffect(() => {
    if (!spy) return;
    if (spy.subfase === 'INTERROGATORIO') {
      mainDeadlineRef.current = Date.now() + spy.tempoRestanteMs;
      setDisplayMainMs(spy.tempoRestanteMs);
    } else if (spy.subfase === 'VOTACAO') {
      setDisplayMainMs(spy.tempoRestanteMs);
    } else if (spy.subfase === 'CARTADA_FINAL') {
      setDisplayMainMs(0);
      cartadaDeadlineRef.current = Date.now() + spy.tempoRestanteCartadaMs;
      setDisplayCartadaMs(spy.tempoRestanteCartadaMs);
    }
  }, [
    spy?.subfase,
    spy?.tempoRestanteMs,
    spy?.tempoRestanteCartadaMs,
    spy?.fimTimerTimestamp,
    spy?.fimCartadaTimestamp,
  ]);

  // Tick local suave (250ms) sem depender do relógio absoluto do celular
  useEffect(() => {
    if (!spy || isGameOver) return;
    const interval = window.setInterval(() => {
      if (spy.subfase === 'INTERROGATORIO') {
        setDisplayMainMs(Math.max(0, mainDeadlineRef.current - Date.now()));
      } else if (spy.subfase === 'CARTADA_FINAL') {
        setDisplayCartadaMs(Math.max(0, cartadaDeadlineRef.current - Date.now()));
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [spy?.subfase, isGameOver]);

  // Confete ao encerrar a partida
  useEffect(() => {
    if (isGameOver && spy?.vencedor) {
      const colors =
        spy.vencedor === 'impostor'
          ? ['#18181B', '#FACC15', '#E11D48']
          : ['#4ADE80', '#2563EB', '#FACC15'];
      confetti({
        particleCount: 95,
        spread: 75,
        origin: { y: 0.6 },
        colors,
      });
    }
  }, [isGameOver, spy?.vencedor]);

  if (!spy) {
    return null;
  }

  const isFinalShot = !isGameOver && spy.subfase === 'CARTADA_FINAL';
  const isVoting = !isGameOver && spy.subfase === 'VOTACAO';
  const isLastMinute =
    !isGameOver && spy.subfase === 'INTERROGATORIO' && displayMainMs <= 60_000;
  const isParticipant = spy.ehImpostor || Boolean(spy.local);

  const toggleCrossLocation = (locName: string) => {
    setCrossedLocations((prev) => ({
      ...prev,
      [locName]: !prev[locName],
    }));
  };

  const revealStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsIdentityRevealed(true);
  };

  const revealEnd = () => {
    setIsIdentityRevealed(false);
  };

  return (
    <div className="min-h-[100dvh] max-w-4xl mx-auto px-2.5 sm:px-5 py-2.5 sm:py-4 flex flex-col justify-between gap-3">
      {/* HUD SUPERIOR: RELÓGIO DIGITAL, SALA E PRIMEIRO A PERGUNTAR */}
      <header className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-3 sm:p-4 shadow-[0_4px_0_0_#18181b] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Relógio Digital Tátil */}
          <div
            className={`px-3.5 py-2 rounded-xl border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] flex items-center gap-2 transition-colors ${
              isGameOver
                ? 'bg-[#FACC15] text-zinc-900'
                : isFinalShot
                ? 'bg-[#18181B] text-[#FACC15] animate-pulse'
                : isVoting
                ? 'bg-[#FACC15] text-zinc-900'
                : isLastMinute
                ? 'bg-[#E11D48] text-white animate-pulse'
                : 'bg-white text-zinc-900'
            }`}
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <div className="leading-none">
              <div className="text-[9px] font-mono font-bold uppercase tracking-wider opacity-85">
                {isGameOver
                  ? 'ENCERRADO'
                  : isFinalShot
                  ? 'CARTADA FINAL'
                  : isVoting
                  ? 'PAUSADO (VOTO)'
                  : 'TEMPO'}
              </div>
              <div className="text-xl sm:text-3xl font-mono font-extrabold tracking-tight">
                {isGameOver
                  ? '00:00'
                  : isFinalShot
                  ? `${Math.ceil(displayCartadaMs / 1000)}s`
                  : formatMsToClock(displayMainMs)}
              </div>
            </div>
          </div>

          {/* Info Central da Sala */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="text-[10px] sm:text-xs font-mono font-bold text-zinc-600">
              SALA <strong className="text-zinc-900">{roomState.roomCode}</strong>
            </div>
            <div className="-rotate-2 mt-0.5 px-2.5 py-0.5 rounded-lg bg-[#18181B] text-[#FACC15] border-2 border-zinc-900 text-[10px] sm:text-xs font-mono font-extrabold uppercase">
              O IMPOSTOR • #{roomState.partidaNumero}
            </div>
          </div>

          {/* Botões Rápidos */}
          <div className="flex items-center gap-1.5 shrink-0">
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
              title="Jogadores & Histórico"
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

        {/* Badge de quem começa perguntando */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FACC15] border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b] text-xs font-mono font-extrabold text-zinc-900">
            <Mic className="w-4 h-4 shrink-0" />
            <span>
              🎙️ {spy.primeiroAPerguntarNickname} faz a primeira pergunta!
            </span>
          </div>
        </div>
      </header>

      {/* BANNER DA CARTADA FINAL (15s) */}
      {isFinalShot && (
        <section className="bg-[#18181B] border-2 border-zinc-900 rounded-2xl p-4 shadow-[0_6px_0_0_#18181b] text-white space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FACC15] text-zinc-900 font-mono text-xs font-extrabold uppercase">
              <Crosshair className="w-4 h-4" />
              <span>CARTADA FINAL DO IMPOSTOR</span>
            </div>
            <span className="font-mono text-xl font-extrabold text-[#FACC15]">
              {Math.ceil(displayCartadaMs / 1000)}s restantes
            </span>
          </div>

          <p className="font-display text-base sm:text-xl font-extrabold text-white">
            {spy.impostorReveladoNickname ?? 'O Impostor'} é o Impostor! Ele tem 15 segundos para adivinhar o local...
          </p>

          {spy.ehImpostor ? (
            <div className="bg-[#FACC15] text-zinc-900 rounded-xl px-3.5 py-2.5 font-mono text-xs sm:text-sm font-extrabold border-2 border-zinc-900">
              🎯 SUA CHANCE! Toque em 1 local da lista abaixo para tentar roubar a vitória!
            </div>
          ) : (
            <p className="text-xs font-mono text-zinc-300">
              Segurem a respiração! Se ele acertar o local agora, o Impostor vence.
            </p>
          )}
        </section>
      )}

      {/* TELA DE RESULTADO (fase === 'FIM') */}
      {isGameOver && spy.vencedor && (
        <section className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-4 sm:p-5 shadow-[0_6px_0_0_#18181b] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div
                className={`p-3 rounded-2xl border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] hidden sm:flex ${
                  spy.vencedor === 'impostor'
                    ? 'bg-[#18181B] text-[#FACC15]'
                    : 'bg-[#4ADE80] text-zinc-900'
                }`}
              >
                {spy.vencedor === 'impostor' ? (
                  <Skull className="w-7 h-7" />
                ) : (
                  <Trophy className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="inline-block px-2 py-0.5 rounded bg-[#FACC15] border border-zinc-900 text-[10px] font-mono uppercase tracking-widest text-zinc-900 font-extrabold mb-1">
                  FIM DA RODADA // RESULTADO OFICIAL
                </div>
                <h2
                  className={`font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight ${
                    spy.vencedor === 'impostor' ? 'text-[#E11D48]' : 'text-[#16A34A]'
                  }`}
                >
                  {spy.vencedor === 'impostor'
                    ? 'VITÓRIA DO IMPOSTOR!'
                    : 'VITÓRIA DOS INOCENTES!'}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-700 font-medium mt-0.5">
                  {getSpyfallWinReasonText(
                    spy.motivoVitoria,
                    spy.impostorReveladoNickname ?? 'O Impostor',
                    spy.localSecretoFim,
                    spy.ultimoPalpiteLocal
                  )}
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
                  <span>Jogar Novamente</span>
                </button>
                <button
                  type="button"
                  onClick={onBackToLobby}
                  className="min-h-[48px] px-4 py-3 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-bold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
                >
                  <Users className="w-4 h-4" />
                  <span>Trocar de Jogo (Voltar ao Lobby)</span>
                </button>
              </div>
            ) : (
              <div className="text-xs font-mono font-bold text-zinc-900 bg-[#FACC15] px-3.5 py-2 rounded-xl border-2 border-zinc-900">
                Aguardando o Host decidir o próximo passo...
              </div>
            )}
          </div>

          {/* Destaque do Impostor e do Local Secreto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#18181B] text-white border-2 border-zinc-900 rounded-xl p-3.5 shadow-[0_3px_0_0_#18181b]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#FACC15] font-bold">
                O IMPOSTOR ERA
              </div>
              <div className="font-display text-lg sm:text-xl font-extrabold flex items-center gap-2 mt-1">
                <Skull className="w-5 h-5 text-[#FACC15]" />
                <span>{spy.impostorReveladoNickname ?? '—'}</span>
              </div>
            </div>

            <div className="bg-[#4ADE80] text-zinc-900 border-2 border-zinc-900 rounded-xl p-3.5 shadow-[0_3px_0_0_#18181b]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-800 font-bold">
                LOCAL SECRETO DA RODADA
              </div>
              <div className="font-display text-lg sm:text-xl font-extrabold flex items-center gap-2 mt-1">
                <MapPin className="w-5 h-5 text-zinc-900" />
                <span>{spy.localSecretoFim ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Cargos de cada jogador na rodada */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 mb-2">
              Papéis e Cargos da Rodada
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {spy.revelacaoJogadores.map((p) => (
                <div
                  key={p.playerId}
                  className={`px-3 py-2.5 rounded-xl border-2 border-zinc-900 flex items-center justify-between gap-2 ${
                    p.ehImpostor ? 'bg-[#18181B] text-[#FACC15]' : 'bg-[#F3EFE6] text-zinc-900'
                  }`}
                >
                  <span className="font-bold text-sm truncate">{p.nickname}</span>
                  <span
                    className={`text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border ${
                      p.ehImpostor
                        ? 'bg-[#FACC15] text-zinc-900 border-zinc-900'
                        : 'bg-white text-zinc-900 border-zinc-900'
                    }`}
                  >
                    {p.ehImpostor ? 'IMPOSTOR' : p.cargo ?? 'Inocente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CARTÃO DE IDENTIDADE SECRETA ("SEGURE PARA REVELAR" — ANTI-OLHO CURIOSO) */}
      {!isGameOver && (
        <section>
          <div
            role="button"
            tabIndex={0}
            onPointerDown={revealStart}
            onPointerUp={revealEnd}
            onPointerLeave={revealEnd}
            onPointerCancel={revealEnd}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
            className={`touch-none select-none cursor-pointer rounded-2xl border-2 border-zinc-900 p-5 sm:p-6 shadow-[0_6px_0_0_#18181b] transition-all text-center ${
              !isIdentityRevealed
                ? 'bg-[#FFFDF9] hover:bg-[#FFFBEB] text-zinc-900'
                : !isParticipant
                ? 'bg-[#F3EFE6] text-zinc-900 translate-y-[2px] shadow-[0_3px_0_0_#18181b]'
                : spy.ehImpostor
                ? 'bg-[#18181B] text-[#FACC15] translate-y-[2px] shadow-[0_3px_0_0_#18181b]'
                : 'bg-[#4ADE80] text-zinc-900 translate-y-[2px] shadow-[0_3px_0_0_#18181b]'
            }`}
          >
            {!isIdentityRevealed ? (
              <div className="space-y-2 py-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FACC15] border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] mx-auto">
                  <Eye className="w-6 h-6 text-zinc-900" />
                </div>
                <div className="font-display text-base sm:text-xl font-extrabold uppercase tracking-wide text-zinc-900">
                  👁️ SEGURE AQUI PARA VER SUA IDENTIDADE
                </div>
                <p className="text-xs font-mono font-bold text-zinc-600">
                  Mantenha o dedo pressionado — ao soltar, a tela esconde na hora!
                </p>
              </div>
            ) : !isParticipant ? (
              <div className="space-y-1.5 py-2">
                <div className="font-display text-lg font-extrabold uppercase">
                  RODADA EM ANDAMENTO
                </div>
                <p className="text-xs font-mono font-bold text-zinc-700">
                  Você entrou após o sorteio. Aguarde a próxima rodada para receber um papel!
                </p>
              </div>
            ) : spy.ehImpostor ? (
              <div className="space-y-2 py-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FACC15] border-2 border-zinc-900 text-zinc-900 mx-auto">
                  <Skull className="w-7 h-7" />
                </div>
                <div className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-[#FACC15]">
                  VOCÊ É O IMPOSTOR
                </div>
                <p className="text-xs sm:text-sm font-mono font-bold text-white">
                  Descubra onde eles estão sem dar bandeira nas perguntas!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 py-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-900 text-[#4ADE80] font-mono text-[10px] font-extrabold uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>AGENTE INOCENTE</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase text-zinc-800">
                    LOCAL SECRETO
                  </div>
                  <div className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-zinc-900">
                    {spy.local}
                  </div>
                </div>
                <div className="inline-block px-4 py-1.5 rounded-xl bg-[#FFFDF9] border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b]">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-600 block">
                    SEU CARGO
                  </span>
                  <span className="font-display font-extrabold text-sm sm:text-base text-zinc-900">
                    {spy.cargo}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CHECKLIST INTERATIVO DE LOCAIS (32 LOCAIS) */}
      <section className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-3.5 sm:p-4 shadow-[0_4px_0_0_#18181b] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>
              {isFinalShot && spy.ehImpostor
                ? 'ESCOLHA O LOCAL DA CARTADA FINAL'
                : `LISTA DE LOCAIS POSSÍVEIS (${spy.listaLocais.length})`}
            </span>
          </div>
          {!(isFinalShot && spy.ehImpostor) && (
            <span className="text-[10px] font-mono font-bold text-zinc-600">
              Toque para riscar suspeitas localmente
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
          {spy.listaLocais.map((locName) => {
            const isCrossed = Boolean(crossedLocations[locName]);
            const canImpostorPick = isFinalShot && spy.ehImpostor;
            const isSecretAtEnd = isGameOver && spy.localSecretoFim === locName;

            return (
              <button
                key={locName}
                type="button"
                onClick={() => {
                  if (canImpostorPick) {
                    onGuessLocation(locName);
                  } else {
                    toggleCrossLocation(locName);
                  }
                }}
                className={`min-h-[42px] px-2.5 py-2 rounded-xl border-2 border-zinc-900 text-left text-xs font-bold leading-tight transition-all flex items-center justify-between gap-1 ${
                  isSecretAtEnd
                    ? 'bg-[#4ADE80] text-zinc-900 shadow-[0_3px_0_0_#18181b]'
                    : canImpostorPick
                    ? 'bg-[#FACC15] hover:bg-[#FDE047] active:translate-y-[2px] active:shadow-none text-zinc-900 shadow-[0_3px_0_0_#18181b] cursor-pointer'
                    : isCrossed
                    ? 'bg-[#D6CFC2] text-[#57534E] line-through opacity-40'
                    : 'bg-white hover:bg-[#FFFBEB] text-zinc-900 shadow-[0_2px_0_0_#18181b] active:translate-y-[2px] active:shadow-none'
                }`}
              >
                <span className="break-words">{locName}</span>
                {isSecretAtEnd && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* BARRA DE AÇÕES DO JOGO (INTERROGATÓRIO) */}
      {!isGameOver && spy.subfase === 'INTERROGATORIO' && isParticipant && (
        <footer className="sticky bottom-1.5 z-30 bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-2.5 sm:p-3.5 shadow-[0_6px_0_0_#18181b]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={spy.chamouVotacao}
              onClick={onCallVote}
              className={`min-h-[48px] px-4 py-3 rounded-xl border-2 border-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                spy.chamouVotacao
                  ? 'bg-[#D6CFC2] text-zinc-600 opacity-60 cursor-not-allowed'
                  : 'bg-[#FACC15] hover:bg-[#FDE047] active:translate-y-[3px] active:shadow-none text-zinc-900 shadow-[0_4px_0_0_#18181b]'
              } ${!spy.ehImpostor ? 'sm:col-span-2' : ''}`}
            >
              <Vote className="w-4 h-4 shrink-0" />
              <span>
                {spy.chamouVotacao ? 'Votação Já Utilizada Nesta Rodada' : '🚨 Chamar Votação'}
              </span>
            </button>

            {spy.ehImpostor && (
              <button
                type="button"
                onClick={onRiskLocation}
                className="min-h-[48px] px-4 py-3 rounded-xl bg-[#18181B] hover:bg-zinc-800 active:translate-y-[3px] active:shadow-none text-[#FACC15] font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
              >
                <Crosshair className="w-4 h-4 shrink-0" />
                <span>🎯 Arriscar Local Agora</span>
              </button>
            )}
          </div>
        </footer>
      )}

      {/* MODAL DE VOTAÇÃO SECRETA (subfase === 'VOTACAO') */}
      {isVoting && spy.votacaoAtual && (
        <div className="fixed inset-0 z-50 bg-zinc-900/70 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl max-w-md w-full p-5 shadow-[0_6px_0_0_#18181b] space-y-4 text-zinc-900">
            <div className="flex items-center justify-between border-b-2 border-zinc-900/15 pb-3">
              <div className="flex items-center gap-2 font-mono font-extrabold text-xs uppercase tracking-wider text-[#E11D48]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>VOTAÇÃO DE EMERGÊNCIA</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-[#FACC15] border-2 border-zinc-900 font-mono text-xs font-extrabold">
                {spy.votacaoAtual.votosRecebidos} / {spy.votacaoAtual.totalVotantes} votos
              </span>
            </div>

            <div className="bg-[#F3EFE6] border-2 border-zinc-900 rounded-xl p-3 text-xs font-medium text-zinc-800">
              <strong className="text-zinc-900">{spy.votacaoAtual.chamadoPorNickname}</strong> pausou o relógio! Vote em segredo em quem você acha que é o Impostor. Maioria absoluta decide!
            </div>

            {spy.votacaoAtual.jaVotei ? (
              <div className="py-6 text-center space-y-2 bg-[#4ADE80] border-2 border-zinc-900 rounded-xl p-4">
                <Check className="w-8 h-8 mx-auto text-zinc-900" />
                <div className="font-display font-extrabold uppercase text-base text-zinc-900">
                  Voto Secreto Registrado!
                </div>
                <p className="text-xs font-mono font-bold text-zinc-800">
                  Aguardando os demais jogadores votarem ({spy.votacaoAtual.votosRecebidos}/
                  {spy.votacaoAtual.totalVotantes})...
                </p>
              </div>
            ) : !isParticipant ? (
              <div className="py-4 text-center text-xs font-mono font-bold text-zinc-700">
                Aguardando a votação dos participantes da rodada...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {roomState.jogadores.map((p) => {
                  const isMe = p.playerId === roomState.meuPlayerId;
                  return (
                    <button
                      key={p.playerId}
                      type="button"
                      onClick={() => onCastVote(p.playerId)}
                      className="min-h-[48px] px-3.5 py-3 rounded-xl bg-white hover:bg-[#FACC15] active:translate-y-[2px] active:shadow-none text-zinc-900 font-display font-extrabold text-sm border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] flex items-center justify-between gap-2 transition-all"
                    >
                      <span className="truncate">{p.nickname}</span>
                      {isMe && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-[#FACC15]">
                          VOCÊ
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE QR CODE / CONVITE */}
      {showQrModal && (
        <ShareRoomModal
          roomCode={roomState.roomCode}
          lanUrl={roomState.lanUrl}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* MODAL DE JOGADORES & HISTÓRICO */}
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
                <span>Jogadores & Histórico ({BRANDING.games.spyfall.title})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-2 rounded-lg bg-white hover:bg-zinc-100 active:translate-y-[2px] active:shadow-none border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b] text-zinc-900 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div>
                <h3 className="font-mono font-bold uppercase text-zinc-700 mb-2">
                  Jogadores na Sala ({roomState.jogadores.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {roomState.jogadores.map((p) => (
                    <div
                      key={p.playerId}
                      className="px-3 py-2 rounded-xl bg-[#F3EFE6] border-2 border-zinc-900 flex items-center justify-between gap-1 font-bold"
                    >
                      <span className="truncate">{p.nickname}</span>
                      <span
                        className={`w-2 h-2 rounded-full border border-zinc-900 shrink-0 ${
                          p.connected ? 'bg-[#4ADE80]' : 'bg-[#E11D48]'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-mono font-bold uppercase text-zinc-700 mb-2">
                  Registro da Partida
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
