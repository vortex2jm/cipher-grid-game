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
      <div className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl shadow-[0_4px_0_0_#18181b] overflow-hidden flex flex-col justify-between">
        <div>
          <div
            className={`px-4 py-3 border-b-2 border-zinc-900 flex items-center justify-between ${
              isBlue ? 'bg-[#2563EB] text-white' : 'bg-[#E11D48] text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white border-2 border-zinc-900 shrink-0" />
              <h2 className="font-display font-extrabold uppercase tracking-wider text-sm sm:text-lg">
                {BRANDING.teams[team].name}
              </h2>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border-2 border-zinc-900 ${
                players.length >= 2
                  ? 'bg-[#FFFDF9] text-zinc-900'
                  : 'bg-[#FACC15] text-zinc-900'
              }`}
            >
              {players.length} / mín. 2
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            {players.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider border-2 border-dashed border-zinc-300 bg-[#F3EFE6] rounded-xl">
                Nenhum agente neste esquadrão
              </div>
            ) : (
              <ol className="space-y-2.5">
                {players.map((p, idx) => {
                  const isMe = p.playerId === roomState.meuPlayerId;
                  const willBeCaptain = idx === nextCapIdx;
                  const willBeFirstSpokesperson = idx === nextSpokesIdx;

                  return (
                    <li
                      key={p.playerId}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b] transition-all ${
                        isMe ? 'bg-[#FEF08A] text-zinc-900' : 'bg-white text-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#F3EFE6] border-2 border-zinc-900 font-mono text-xs font-bold flex items-center justify-center text-zinc-900 shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm sm:text-base tracking-wide truncate">
                          {p.nickname}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-[#FACC15] shrink-0 font-bold">
                            VOCÊ
                          </span>
                        )}
                        {p.isHost && (
                          <span
                            title="Host da Sala"
                            className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#FACC15] text-zinc-900 border-2 border-zinc-900 shrink-0 font-bold"
                          >
                            <Crown className="w-3 h-3" /> HOST
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {willBeCaptain && (
                          <span
                            title="Será o Capitão na próxima partida"
                            className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-zinc-900 text-white border border-zinc-900 font-bold"
                          >
                            CAPITÃO
                          </span>
                        )}
                        {willBeFirstSpokesperson && (
                          <span
                            title="Será o 1º Porta-voz na próxima partida"
                            className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#4ADE80] text-zinc-900 border-2 border-zinc-900 font-bold"
                          >
                            1º PORTA-VOZ
                          </span>
                        )}
                        <span
                          title={p.connected ? 'Online' : 'Reconectando...'}
                          className={`w-2.5 h-2.5 rounded-full border border-zinc-900 ${
                            p.connected ? 'bg-[#4ADE80]' : 'bg-[#FACC15] animate-ping'
                          }`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-[#F3EFE6] border-t-2 border-zinc-900 flex items-center justify-between text-[11px] font-mono font-bold text-zinc-700">
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
      <header className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-3.5 sm:p-5 flex flex-col gap-3.5 shadow-[0_4px_0_0_#18181b]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FACC15] border-2 border-zinc-900 text-[10px] font-mono font-bold text-zinc-900 uppercase tracking-widest">
              <Shield className="w-3 h-3 shrink-0" />
              <span>LOBBY DA SALA</span>
            </div>
            <h1 className="font-display text-lg sm:text-2xl font-extrabold uppercase tracking-tight text-zinc-900 mt-1.5">
              {BRANDING.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            title="Sair da Sala"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white hover:bg-[#E11D48] hover:text-white active:translate-y-[2px] active:shadow-none border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] text-zinc-900 transition-all shrink-0 flex items-center justify-center"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Barra de Convite: Código + Copiar Link + QR Code */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch">
          {/* Código da Sala */}
          <div className="sm:col-span-5 bg-[#F3EFE6] border-2 border-zinc-900 rounded-xl px-3.5 py-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-600">
                CÓDIGO DA SALA
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-[0.2em] text-zinc-900 leading-none mt-0.5">
                {roomState.roomCode}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="min-h-[42px] px-3 py-2 rounded-lg bg-white hover:bg-[#FFFBEB] active:translate-y-[2px] active:shadow-none border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] text-zinc-900 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              title="Copiar código"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-[#16A34A]" />
                  <span>Copiado</span>
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
              className="min-h-[48px] py-3 px-3 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
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
              className="min-h-[48px] py-3 px-3 rounded-xl bg-[#FFFDF9] hover:bg-zinc-100 active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4 text-zinc-900 shrink-0" />
              <span>QR Code da Sala</span>
            </button>
          </div>
        </div>
      </header>

      {/* Seu Time Atual + Botão de Trocar de Time */}
      <div className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-xl px-3.5 py-3 shadow-[0_4px_0_0_#18181b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-700">
        <div className="flex items-start sm:items-center gap-2.5">
          <Radio className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            Você está no{' '}
            <strong
              className={`px-1.5 py-0.5 rounded font-bold text-white ${
                roomState.meuTime === 'azul' ? 'bg-[#2563EB]' : 'bg-[#E11D48]'
              }`}
            >
              {BRANDING.teams[roomState.meuTime].name}
            </strong>
            . Os papéis (<strong className="text-zinc-900">Capitão</strong> e{' '}
            <strong className="text-zinc-900">Porta-voz</strong>) rodam sozinhos na fila!
          </span>
        </div>

        <button
          type="button"
          onClick={onSwitchTeam}
          className="min-h-[48px] shrink-0 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-bold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
        >
          <ArrowLeftRight className="w-4 h-4 text-zinc-900" />
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
      <footer className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-3.5 sm:p-5 shadow-[0_4px_0_0_#18181b]">
        {isHost ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-900">
              <span className="p-1.5 rounded-lg bg-[#FACC15] border-2 border-zinc-900 shrink-0">
                <Crown className="w-3.5 h-3.5" />
              </span>
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
                className="min-h-[48px] px-4 py-3 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
              >
                <Shuffle className="w-4 h-4 text-zinc-900" />
                <span>Sortear Times</span>
              </button>

              <button
                type="button"
                onClick={onStartGame}
                disabled={!canStart}
                className="min-h-[48px] px-5 py-3 rounded-xl bg-[#4ADE80] hover:bg-[#86EFAC] active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs sm:text-sm border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Partida</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold text-zinc-700">
              <Users className="w-4 h-4 text-zinc-900 shrink-0" />
              <span>
                Aguardando o Host (
                <strong className="text-zinc-900">
                  {roomState.jogadores.find((j) => j.isHost)?.nickname ?? 'Host'}
                </strong>
                ) iniciar a partida...
              </span>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#F3EFE6] border-2 border-zinc-900 text-zinc-900">
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
