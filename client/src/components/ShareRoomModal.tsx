import React, { useMemo, useState } from 'react';
import { Check, Copy, QrCode, Share2, Wifi, X } from 'lucide-react';
import { generateQrMatrix } from '../utils/qrcode';

interface ShareRoomModalProps {
  roomCode: string;
  lanUrl?: string;
  onClose: () => void;
}

export function buildRoomInviteUrl(roomCode: string, lanUrl?: string): string {
  const origin = window.location.origin;
  const isLocalhost =
    origin.includes('localhost') || origin.includes('127.0.0.1');
  const baseUrl = isLocalhost && lanUrl ? lanUrl : origin;
  return `${baseUrl.replace(/\/$/, '')}/?room=${roomCode.toUpperCase()}`;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  roomCode,
  lanUrl,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(
    () => buildRoomInviteUrl(roomCode, lanUrl),
    [roomCode, lanUrl]
  );

  const qrMatrix = useMemo(() => generateQrMatrix(inviteUrl), [inviteUrl]);
  const size = qrMatrix.length;
  const quietZone = 3;
  const viewBoxSize = size + quietZone * 2;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Sala ${roomCode} — Código Secreto`,
          text: `Entre direto na nossa operação (Sala ${roomCode}):`,
          url: inviteUrl,
        });
        return;
      } catch {
        // Usuário cancelou ou não suportado
      }
    }
    await handleCopyLink();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border-2 border-cyan-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            <QrCode className="w-4 h-4" />
            <span>CONVIDAR PARA SALA {roomCode}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Aponte a câmera do celular (no mesmo Wi-Fi) para entrar direto na sala{' '}
          <strong className="text-cyan-300 font-mono">{roomCode}</strong>:
        </p>

        {/* QR Code SVG Container */}
        <div className="bg-white p-3.5 rounded-2xl inline-block mx-auto shadow-[0_0_30px_rgba(6,182,212,0.25)]">
          <svg
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            className="w-48 h-48 sm:w-56 sm:h-56 block"
            shapeRendering="crispEdges"
          >
            <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
            {qrMatrix.map((row, r) =>
              row.map((cell, c) =>
                cell ? (
                  <rect
                    key={`${r}-${c}`}
                    x={c + quietZone}
                    y={r + quietZone}
                    width={1}
                    height={1}
                    fill="#020617"
                  />
                ) : null
              )
            )}
          </svg>
        </div>

        {/* Link + Botões */}
        <div className="space-y-2.5 text-left">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-mono text-cyan-300 truncate select-all">
              {inviteUrl}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 text-white font-bold uppercase tracking-wider text-xs border border-slate-600 border-b-4 flex items-center justify-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-cyan-400" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="py-3 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:translate-y-0.5 text-slate-950 font-extrabold uppercase tracking-wider text-xs border-b-4 border-cyan-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

