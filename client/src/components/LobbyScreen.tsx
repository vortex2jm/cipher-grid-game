import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Crown,
  LogOut,
  Play,
  QrCode,
  Radio,
  Share2,
  Shuffle,
  Shield,
  Users,
} from 'lucide-react';
import { BRANDING } from '../../../shared/branding';
import { PlayerDTO, RoomStateDTO } from '../../../shared/types';
import { buildRoomInviteUrl, ShareRoomModal } from './ShareRoomModal';

interface LobbyScreenProps {
  roomState: RoomStateDTO;
  onSwitchTeam: () => void;
  onShuffleTeams: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomState,
  onSwitchTeam,
  onShuffleTeams,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const isHost = roomState.meuPlayerId === roomState.hostId;
  const bluePlayers = roomState.jogadores.filter((p) => p.team === 'azul');
  const redPlayers = roomState.jogadores.filter((p) => p.team === 'vermelho');
  const canStart = bluePlayers.length >= 2 && redPlayers.length >= 2;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomState.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleQuickShareLink = async () => {
    const inviteUrl = buildRoomInviteUrl(roomState.roomCode, roomState.lanUrl);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Sala ${roomState.roomCode} — ${BRANDING.title}`,
          text: `Entre direto na nossa sala (${roomState.roomCode}):`,
          url: inviteUrl,
        });
        return;
      } catch {
        // Fallback para copiar link
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setShowQrModal(true);
    }
  };

  const getNextCaptainIndex = (team: 'azul' | 'vermelho', listLength: number) => {
    if (listLength === 0) return -1;
    return roomState.partidaNumero === 0
      ? 0
      : roomState.indiceCapitao[team] % listLength;
  };

  const renderTeamColumn = (team: 'azul' | 'vermelho', players: PlayerDTO[]) => {
    const isBlue = team === 'azul';
    const nextCapIdx = getNextCaptainIndex(team, players.length);
    const nextSpokesIdx = players.length > 1 ? (nextCapIdx + 1) % players.length : -1;

    return (
      <div
        className={`rounded-2xl border-2 p-3.5 sm:p-5 flex flex-col justify-between transition-all ${
          isBlue
            ? 'bg-blue-950/25 border-blue-500/40 shadow-[0_0_25px_rgba(37,99,235,0.1)]'
            : 'bg-rose-950/25 border-rose-500/40 shadow-[0_0_25px_rgba(225,29,72,0.1)]'
        }`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isBlue
                    ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'
                    : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                }`}
              />
              <h2
                className={`font-extrabold uppercase tracking-wider text-sm sm:text-lg ${
                  isBlue ? 'text-blue-400' : 'text-rose-400'
                }`}
              >
                {BRANDING.teams[team].name}
              </h2>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                players.length >= 2
                  ? isBlue
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {players.length} / mín. 2
            </span>
          </div>

          {players.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs uppercase tracking-wider border border-dashed border-slate-800 rounded-xl">
              Nenhum agente neste esquadrão
            </div>
          ) : (
            <ol className="space-y-2">
              {players.map((p, idx) => {
                const isMe = p.playerId === roomState.meuPlayerId;
                const willBeCaptain = idx === nextCapIdx;
                const willBeFirstSpokesperson = idx === nextSpokesIdx;

                return (
                  <li
                    key={p.playerId}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                      isMe
                        ? isBlue
                          ? 'bg-blue-600/25 border-blue-400 text-white'
                          : 'bg-rose-600/25 border-rose-400 text-white'
                        : 'bg-slate-900/90 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs font-bold flex items-center justify-center text-slate-400 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-sm sm:text-base tracking-wide truncate">
                        {p.nickname}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 font-bold">
                          VOCÊ
                        </span>
                      )}
                      {p.isHost && (
                        <span
                          title="Host da Sala"
                          className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0"
                        >
                          <Crown className="w-3 h-3" /> HOST
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {willBeCaptain && (
                        <span
                          title="Será o Capitão na próxima partida"
                          className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-purple-500/25 text-purple-200 border border-purple-400/50 font-bold"
                        >
                          CAPITÃO
                        </span>
                      )}
                      {willBeFirstSpokesperson && (
                        <span
                          title="Será o 1º Porta-voz na próxima partida"
                          className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 font-bold"
                        >
                          1º PORTA-VOZ
                        </span>
                      )}
                      <span
                        title={p.connected ? 'Online' : 'Reconectando...'}
                        className={`w-2 h-2 rounded-full ${
                          p.connected ? 'bg-emerald-400' : 'bg-amber-500 animate-ping'
                        }`}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>FILA CIRCULAR AUTOMÁTICA</span>
          <span>
            {players.length < 2
              ? `Falta(m) ${2 - players.length} jogador(es)`
              : 'Esquadrão Pronto ✓'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-6 flex flex-col justify-between gap-4">
      {/* Header com Código, Botão de Compartilhar Link e Botão de QR Code */}
      <header className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-5 flex flex-col gap-3.5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>LOBBY DA SALA</span>
            </div>
            <h1 className="text-base sm:text-2xl font-extrabold uppercase tracking-tight text-white mt-0.5">
              {BRANDING.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            title="Sair da Sala"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 text-slate-400 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Barra de Convite: Código + Copiar Link + QR Code */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
          {/* Código da Sala */}
          <div className="sm:col-span-5 bg-slate-950 border-2 border-cyan-500/50 rounded-xl px-3.5 py-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                CÓDIGO DA SALA
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-[0.2em] text-cyan-300 leading-none mt-0.5">
                {roomState.roomCode}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              title="Copiar código"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Código</span>
                </>
              )}
            </button>
          </div>

          {/* Botões de Compartilhar Link Direto & Mostrar QR Code */}
          <div className="sm:col-span-7 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleQuickShareLink}
              className="py-3 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:translate-y-0.5 text-slate-950 font-extrabold uppercase tracking-wider text-xs border-b-4 border-cyan-700 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Link Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>Compartilhar Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-white font-extrabold uppercase tracking-wider text-xs border-2 border-slate-600 border-b-4 flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>QR Code da Sala</span>
            </button>
          </div>
        </div>
      </header>

      {/* Seu Time Atual + Botão de Trocar de Time */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-start sm:items-center gap-2.5">
          <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            Você está no{' '}
            <strong
              className={
                roomState.meuTime === 'azul' ? 'text-blue-400' : 'text-rose-400'
              }
            >
              {BRANDING.teams[roomState.meuTime].name}
            </strong>
            . Os papéis (<span className="text-purple-300 font-bold">Capitão</span> e{' '}
            <span className="text-emerald-300 font-bold">Porta-voz</span>) rodam sozinhos na fila!
          </span>
        </div>

        <button
          type="button"
          onClick={onSwitchTeam}
          className="shrink-0 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-white font-bold uppercase tracking-wider text-xs border border-slate-600 border-b-4 flex items-center justify-center gap-2 transition-all"
        >
          <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
          <span>
            Ir para {roomState.meuTime === 'azul' ? 'Time Vermelho' : 'Time Azul'}
          </span>
        </button>
      </div>

      {/* Duas Colunas de Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 my-auto">
        {renderTeamColumn('azul', bluePlayers)}
        {renderTeamColumn('vermelho', redPlayers)}
      </div>

      {/* Rodapé de Controle do Host / Status */}
      <footer className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl">
        {isHost ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
              <Crown className="w-4 h-4 shrink-0" />
              <span>
                {canStart
                  ? 'Tudo pronto! Você pode iniciar a partida.'
                  : 'Mínimo de 2 jogadores em cada time para começar.'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onShuffleTeams}
                disabled={roomState.jogadores.length < 2}
                className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 disabled:opacity-40 text-slate-100 font-extrabold uppercase tracking-wider text-xs border border-slate-600 border-b-4 flex items-center justify-center gap-2 transition-all"
              >
                <Shuffle className="w-4 h-4 text-cyan-400" />
                <span>Sortear Times</span>
              </button>

              <button
                type="button"
                onClick={onStartGame}
                disabled={!canStart}
                className="px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold uppercase tracking-wider text-xs sm:text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Partida</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-slate-300">
              <Users className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Aguardando o Host (
                <strong className="text-white">
                  {roomState.jogadores.find((j) => j.isHost)?.nickname ?? 'Host'}
                </strong>
                ) iniciar a partida...
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {canStart
                ? 'Equipes completas ✓'
                : `Azuis (${bluePlayers.length}/2) • Vermelhos (${redPlayers.length}/2)`}
            </span>
          </div>
        )}
      </footer>

      {showQrModal && (
        <ShareRoomModal
          roomCode={roomState.roomCode}
          lanUrl={roomState.lanUrl}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
