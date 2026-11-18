import React, { useMemo, useState } from 'react';
import { Check, Copy, QrCode, Share2, Wifi, X } from 'lucide-react';
import { generateQrMatrix } from '../utils/qrcode';
import { BRANDING } from '../../../shared/branding';

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
          title: `Sala ${roomCode} — ${BRANDING.title}`,
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
      className="fixed inset-0 z-50 bg-zinc-900/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF9] border-2 border-zinc-900 rounded-2xl max-w-sm w-full p-5 shadow-[0_6px_0_0_#18181b] space-y-4 text-center text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-900/15 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-900 font-bold">
            <QrCode className="w-4 h-4" />
            <span>CONVIDAR PARA SALA {roomCode}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white hover:bg-zinc-100 active:translate-y-[2px] active:shadow-none border-2 border-zinc-900 shadow-[0_2px_0_0_#18181b] text-zinc-900 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-700 font-medium leading-relaxed">
          Aponte a câmera do celular (no mesmo Wi-Fi) para entrar direto na sala{' '}
          <strong className="px-1.5 py-0.5 rounded bg-[#FACC15] border border-zinc-900 text-zinc-900 font-mono">
            {roomCode}
          </strong>
          :
        </p>

        {/* QR Code SVG Container */}
        <div className="bg-white p-3.5 rounded-xl border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] inline-block mx-auto">
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
                    fill="#18181B"
                  />
                ) : null
              )
            )}
          </svg>
        </div>

        {/* Link + Botões */}
        <div className="space-y-2.5 text-left">
          <div className="bg-[#F3EFE6] border-2 border-zinc-900 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span className="text-xs font-mono font-bold text-zinc-900 truncate select-all">
              {inviteUrl}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-h-[48px] py-3 px-3 rounded-xl bg-white hover:bg-zinc-100 active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-bold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#16A34A]" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-900" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="min-h-[48px] py-3 px-3 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] active:translate-y-[3px] active:shadow-none text-zinc-900 font-display font-extrabold uppercase tracking-wider text-xs border-2 border-zinc-900 shadow-[0_4px_0_0_#18181b] flex items-center justify-center gap-1.5 transition-all"
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
