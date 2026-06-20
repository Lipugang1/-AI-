import { createServer } from 'http';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = false;
const hostname = '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port: PORT });
const handle = app.getRequestHandler();

// ── Voice Chat WebSocket Handler (from ws-handlers/voice.ts) ──
const rooms = new Map();

function setupVoiceHandler(wss) {
  console.log('[Voice] WebSocket Audio Relay Server initialized');

  wss.on('connection', (ws) => {
    let currentUser = null;

    ws.on('message', (raw) => {
      try {
        const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);

        const firstByte = buffer[0];
        const isTextMessage = firstByte === 0x7B;

        if (isTextMessage) {
          const msgStr = buffer.toString('utf-8');
          const msg = JSON.parse(msgStr);

          switch (msg.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;

            case 'join': {
              const { roomId, userId, userName } = msg.payload;
              if (!rooms.has(roomId)) rooms.set(roomId, new Map());
              const room = rooms.get(roomId);

              const existingUsers = Array.from(room.values()).map(u => ({
                userId: u.userId, userName: u.userName, muted: u.muted,
              }));
              ws.send(JSON.stringify({ type: 'room-users', payload: { users: existingUsers } }));

              room.forEach((user) => {
                if (user.ws.readyState === WebSocket.OPEN) {
                  user.ws.send(JSON.stringify({
                    type: 'user-joined', payload: { userId, userName, muted: false },
                  }));
                }
              });

              currentUser = { ws, userId, userName, roomId, muted: false };
              room.set(userId, currentUser);
              console.log(`[Voice] User ${userName} joined room ${roomId}, total: ${room.size}`);
              break;
            }

            case 'leave':
              if (currentUser) leaveRoom(currentUser);
              break;

            case 'mute':
              if (currentUser) {
                currentUser.muted = true;
                broadcast(currentUser.roomId, { type: 'user-muted', payload: { userId: currentUser.userId } }, currentUser.userId);
              }
              break;

            case 'unmute':
              if (currentUser) {
                currentUser.muted = false;
                broadcast(currentUser.roomId, { type: 'user-unmuted', payload: { userId: currentUser.userId } }, currentUser.userId);
              }
              break;
          }
        } else {
          // Binary = audio relay
          if (!currentUser || currentUser.muted) return;
          const room = rooms.get(currentUser.roomId);
          if (!room) return;

          room.forEach((user) => {
            if (user.userId !== currentUser.userId && user.ws.readyState === WebSocket.OPEN) {
              const userIdBuffer = Buffer.from(currentUser.userId, 'utf-8');
              const userIdLen = Buffer.alloc(1);
              userIdLen.writeUInt8(userIdBuffer.length);
              const packet = Buffer.concat([userIdLen, userIdBuffer, buffer]);
              user.ws.send(packet);
            }
          });
        }
      } catch (error) {
        console.error('[Voice] Error:', error);
      }
    });

    ws.on('close', () => {
      if (currentUser) leaveRoom(currentUser);
    });

    function leaveRoom(user) {
      const room = rooms.get(user.roomId);
      if (!room) return;
      room.delete(user.userId);
      broadcast(user.roomId, { type: 'user-left', payload: { userId: user.userId } }, null);
      if (room.size === 0) rooms.delete(user.roomId);
      console.log(`[Voice] User ${user.userName} left, remaining: ${room.size}`);
    }

    function broadcast(roomId, message, excludeUserId) {
      const room = rooms.get(roomId);
      if (!room) return;
      const msgStr = JSON.stringify(message);
      room.forEach((user) => {
        if (user.userId !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
          user.ws.send(msgStr);
        }
      });
    }
  });
}

// ── WS Route Registration ──
const wssMap = new Map();
setupVoiceHandler((() => {
  const wss = new WebSocketServer({ noServer: true });
  wssMap.set('/ws/voice', wss);
  return wss;
})());

function handleUpgrade(req, socket, head) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const wss = wssMap.get(pathname);
  if (wss) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
}

// ── Start Server ──
app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  server.on('upgrade', handleUpgrade);

  server.listen(PORT, hostname, () => {
    console.log(`> Server (HTTP + WS) running at http://${hostname}:${PORT}`);
  });
});
