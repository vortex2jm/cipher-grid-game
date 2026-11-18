import React, { useEffect, useState } from 'react';
import { Shield, Terminal, Users, ArrowRight, PlusCircle, Wifi, QrCode } from 'lucide-react';
import { BRANDING } from '../../../shared/branding';

interface HomeScreenProps {
  initialNickname: string;
  invitedRoomCode?: string;
  isConnected: boolean;
  isLoading: boolean;
  onCreateRoom: (nickname: string) => void;
  onJoinRoom: (nickname: string, roomCode: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  initialNickname,
  invitedRoomCode = '',
  isConnected,
  isLoading,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [nick, setNick] = useState(initialNickname);
  const [roomCode, setRoomCode] = useState(invitedRoomCode);

  useEffect(() => {
    if (invitedRoomCode) {
      setRoomCode(invitedRoomCode);
    }
  }, [invitedRoomCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(nick);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    onJoinRoom(nick, roomCode);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between px-3.5 py-4 sm:py-8 max-w-xl mx-auto">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs font-mono">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFFDF9] border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b] text-zinc-900 font-bold min-w-0">
          <Terminal className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
          <span className="tracking-wider uppercase truncate">{BRANDING.version}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFFDF9] border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b] font-bold shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full border border-zinc-900 ${
              isConnected ? 'bg-[#4ADE80]' : 'bg-[#E11D48] animate-pulse'
            }`}
          />
          <Wifi className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
          <span className="text-zinc-900">
            {isConnected ? 'REDE LAN ONLINE' : 'RECONECTANDO...'}
          </span>
        </div>
      </div>

      {/* Main Dossier Card */}
      <div className="my-auto py-5 sm:py-6">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FACC15] border-2 border-zinc-900 shadow-[0_3px_0_0_#18181b] -rotate-1 text-zinc-900 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-3.5 max-w-full">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{BRANDING.subtitle}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 uppercase leading-tight">
            {BRANDING.title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-medium text-zinc-700 max-w-md mx-auto">
            Forme dois esquadrões no Wi-Fi, decodifique as dicas do seu Capitão e evite o Assassino.
          </p>
        </div>

        {/* Banner de Convite Direto via Link / QR Code */}
        {invitedRoomCode && (
          <div className="mb-4 bg-[#FACC15] border-2 border-zinc-900 rounded-2xl p-3.5 flex items-center gap-3 text-zinc-900 shadow-[0_4px_0_0_#18181b]">
            <div className="p-2.5 rounded-xl bg-[#FFFDF9] border-2 border-zinc-900 text-zinc-900 shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="text-xs sm:text-sm">
              <div className="font-mono uppercase text-[10px] text-zinc-900 font-extrabold tracking-wider">
                CONVITE DIRETO DETECTADO
              </div>
              <div>
                Sala <strong className="font-mono text-zinc-900 text-base">{invitedRoomCode}</strong> pronta! Digite seu Nickname abaixo e toque em <strong>Entrar</strong>.
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl p-5 sm:p-7 shadow-[0_6px_0_0_#18181b] space-y-5">
          {/* Identificação do Agente */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-900 mb-1.5 font-bold">
              1. Seu Apelido (Nickname)
            </label>
            <input
              type="text"
              maxLength={20}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Ex: AGENTE_SOMBRA"
              autoFocus={Boolean(invitedRoomCode && !nick)}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border-2 border-zinc-900 focus:outline-none focus:bg-[#FFFBEB] focus:shadow-[0_3px_0_0_#18181b] text-zinc-900 text-base font-bold tracking-wide placeholder:text-zinc-400 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1">
            {/* Entrar em Sala Existente */}
            <form onSubmit={handleJoin} className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold">
                2A. Entrar em uma Sala
              </label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="w-full min-h-[48px] px-3 py-3 rounded-xl bg-white border-2 border-zinc-900 focus:outline-none focus:bg-[#FFFBEB] focus:shadow-[0_3px_0_0_#18181b] text-center font-mono text-lg font-extrabold uppercase tracking-[0.25em] text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal placeholder:text-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={isLoading || !isConnected}
                  className="shrink-0 min-h-[48px] px-5 sm:px-6 py-3 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-sm border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center gap-2 transition-all"
                >
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t-2 border-zinc-900/15"></div>
              <span className="flex-shrink mx-4 text-xs font-mono font-bold uppercase text-zinc-500">OU</span>
              <div className="flex-grow border-t-2 border-zinc-900/15"></div>
            </div>

            {/* Criar Nova Sala */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-700 font-bold mb-1.5">
                2B. Criar uma Sala Nova
              </label>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isLoading || !isConnected}
                className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-[#4ADE80] hover:bg-[#86EFAC] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-sm border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-2.5 transition-all"
              >
                <PlusCircle className="w-5 h-5 text-zinc-900" />
                <span>Criar Nova Sala</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] font-mono font-bold text-zinc-600 pt-3 border-t-2 border-zinc-900/15">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
          <span>Mín. 4 jogadores (2 por time) • Rotação Automática de Capitão e Porta-voz</span>
        </span>
      </div>
    </div>
  );
};
