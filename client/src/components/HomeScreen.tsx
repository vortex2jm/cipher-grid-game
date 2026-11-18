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
    <div className="min-h-[100dvh] flex flex-col justify-between px-3.5 py-4 sm:py-10 max-w-xl mx-auto">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="tracking-wider uppercase truncate">{BRANDING.version}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Wifi
            className={`w-3.5 h-3.5 ${
              isConnected ? 'text-emerald-400' : 'text-rose-500 animate-pulse'
            }`}
          />
          <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
            {isConnected ? 'REDE LAN ONLINE' : 'RECONECTANDO...'}
          </span>
        </div>
      </div>

      {/* Main Dossier Card */}
      <div className="my-auto py-4 sm:py-6">
        <div className="text-center mb-5 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] sm:text-xs font-mono uppercase tracking-widest mb-3">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{BRANDING.subtitle}</span>
          </div>
          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight text-white uppercase drop-shadow-[0_0_20px_rgba(6,182,212,0.2)] leading-tight">
            {BRANDING.title}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Forme dois esquadrões no Wi-Fi, decodifique as dicas do seu Capitão e evite o Assassino.
          </p>
        </div>

        {/* Banner de Convite Direto via Link / QR Code */}
        {invitedRoomCode && (
          <div className="mb-4 bg-cyan-950/60 border-2 border-cyan-400/60 rounded-2xl p-3.5 flex items-center gap-3 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="text-xs sm:text-sm">
              <div className="font-mono uppercase text-[10px] text-cyan-300 font-bold tracking-wider">
                CONVITE DIRETO DETECTADO
              </div>
              <div>
                Sala <strong className="font-mono text-white text-base">{invitedRoomCode}</strong> pronta! Digite seu Nickname abaixo e toque em <strong>Entrar</strong>.
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-7 shadow-2xl space-y-5">
          {/* Identificação do Agente */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1.5 font-bold">
              1. Seu Apelido (Nickname)
            </label>
            <input
              type="text"
              maxLength={20}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="Ex: AGENTE_SOMBRA"
              autoFocus={Boolean(invitedRoomCode && !nick)}
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 focus:outline-none text-white text-base font-bold tracking-wide placeholder:text-slate-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1">
            {/* Entrar em Sala Existente */}
            <form onSubmit={handleJoin} className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">
                2A. Entrar em uma Sala
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="w-full px-3 py-3.5 rounded-xl bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 focus:outline-none text-center font-mono text-lg font-extrabold uppercase tracking-[0.25em] text-cyan-300 placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading || !isConnected}
                  className="shrink-0 px-5 sm:px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:translate-y-0.5 disabled:opacity-50 text-slate-950 font-extrabold uppercase tracking-wider text-sm border-b-4 border-cyan-700 flex items-center gap-2 transition-all"
                >
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs font-mono uppercase text-slate-500">OU</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Criar Nova Sala */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                2B. Criar uma Sala Nova
              </label>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isLoading || !isConnected}
                className="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 disabled:opacity-50 text-white font-extrabold uppercase tracking-wider text-sm border-2 border-slate-600 border-b-4 flex items-center justify-center gap-2.5 transition-all"
              >
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <span>Criar Nova Sala</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-900">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Mín. 4 jogadores (2 por time) • Rotação Automática de Capitão e Porta-voz</span>
        </span>
      </div>
    </div>
  );
};
