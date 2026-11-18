import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import os from 'os';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { BRANDING } from '../shared/branding.ts';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types.ts';
import { GameEngine, InternalRoom } from './gameEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

function getLocalLanIp(): string {
  const hostIpOverride = process.env.HOST_IP?.trim();
  if (hostIpOverride) {
    return hostIpOverride;
  }

  const interfaces = os.networkInterfaces();
  const virtualIfaces = /^(docker|br-|veth|virbr|tun|tap|lo)/i;
  const candidates: string[] = [];

  for (const name of Object.keys(interfaces)) {
    if (virtualIfaces.test(name)) continue;
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  const preferred = candidates.find(
    (ip) => ip.startsWith('192.168.') || ip.startsWith('10.')
  );
  return preferred ?? candidates[0] ?? 'localhost';
}

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const engine = new GameEngine();
const lanIp = getLocalLanIp();
const clientPortInDev = 5173;
engine.setLanUrl(`http://${lanIp}:${isProduction ? PORT : clientPortInDev}`);

/**
 * Envia o estado individualizado (com blindagem Anti-Cheat por papel)
 * para cada jogador conectado na sala.
 */
function broadcastRoomState(room: InternalRoom): void {
  for (const [playerId, player] of room.jogadores.entries()) {
    if (player.connected && player.socketId) {
      const personalizedState = engine.buildStateForPlayer(room, playerId);
      io.to(player.socketId).emit('atualizar_estado', personalizedState);
    }
  }
}

io.on('connection', (socket) => {
  socket.on('criar_sala', ({ playerId, nickname }, callback) => {
    const res = engine.createRoom(socket.id, playerId, nickname);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Erro ao criar sala.' });
      callback?.({ ok: false, erro: res.erro });
      return;
    }

    socket.join(res.room.roomCode);
    broadcastRoomState(res.room);
    callback?.({ ok: true, roomCode: res.room.roomCode });
  });

  socket.on('entrar_sala', ({ playerId, nickname, roomCode }, callback) => {
    const res = engine.joinRoom(socket.id, playerId, nickname, roomCode);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Erro ao entrar na sala.' });
      callback?.({ ok: false, erro: res.erro });
      return;
    }

    socket.join(res.room.roomCode);
    broadcastRoomState(res.room);
    callback?.({ ok: true, roomCode: res.room.roomCode });
  });

  socket.on('trocar_time', ({ roomCode, playerId }) => {
    const res = engine.switchTeam(roomCode, playerId);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Não foi possível trocar de time.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('sortear_times', ({ roomCode, playerId }) => {
    const res = engine.shuffleTeams(roomCode, playerId);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Não foi possível sortear os times.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('iniciar_partida', ({ roomCode, playerId }) => {
    const res = engine.startGame(roomCode, playerId);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Não foi possível iniciar a partida.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('enviar_dica', ({ roomCode, playerId, palavra, numero }) => {
    const res = engine.sendClue(roomCode, playerId, palavra, numero);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Dica inválida.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('apontar_carta', ({ roomCode, playerId, cardIndex }) => {
    const res = engine.pointCard(roomCode, playerId, cardIndex);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Não foi possível selecionar a carta.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('revelar_carta', ({ roomCode, playerId, cardIndex }) => {
    const res = engine.revealCard(roomCode, playerId, cardIndex);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Não foi possível revelar a carta.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('passar_turno', ({ roomCode, playerId }) => {
    const res = engine.passTurn(roomCode, playerId);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Não foi possível encerrar o turno.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('proxima_partida', ({ roomCode, playerId }) => {
    const res = engine.nextMatchRotateCaptains(roomCode, playerId);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', {
        mensagem: res.erro ?? 'Não foi possível iniciar a próxima partida.',
      });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('voltar_lobby', ({ roomCode, playerId }) => {
    const res = engine.backToLobby(roomCode, playerId);
    if (!res.ok || !res.room) {
      socket.emit('erro_operacao', { mensagem: res.erro ?? 'Não foi possível voltar ao Lobby.' });
      return;
    }
    broadcastRoomState(res.room);
  });

  socket.on('sair_sala', ({ roomCode, playerId }) => {
    socket.leave(roomCode.toUpperCase());
    const updatedRoom = engine.leaveRoom(socket.id, roomCode, playerId);
    if (updatedRoom) {
      broadcastRoomState(updatedRoom);
    }
  });

  socket.on('disconnect', () => {
    const updatedRoom = engine.handleDisconnect(socket.id);
    if (updatedRoom) {
      broadcastRoomState(updatedRoom);
    }
  });
});

// Healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    title: BRANDING.title,
    lanIp,
  });
});

// Em modo Produção LAN, serve o frontend compilado (dist) na mesma porta 3000
const distPath = path.resolve(__dirname, '../dist');
if (isProduction) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, HOST, () => {
  const currentLanIp = getLocalLanIp();
  engine.setLanUrl(`http://${currentLanIp}:${isProduction ? PORT : clientPortInDev}`);
  console.log('\n============================================================');
  console.log(`🕵️  ${BRANDING.title.toUpperCase()}`);
  console.log('============================================================');
  console.log(`✅ Servidor WebSocket + HTTP ativo em: http://localhost:${PORT}`);
  if (isProduction) {
    console.log(`📱 Acesse pelo celular na rede Wi-Fi (LAN): http://${currentLanIp}:${PORT}`);
  } else {
    console.log(`💻 Modo DEV (Vite): http://${currentLanIp}:${clientPortInDev}`);
    console.log(`🔌 Proxy Socket.io apontando para: http://${currentLanIp}:${PORT}`);
  }
  console.log('============================================================\n');
});

