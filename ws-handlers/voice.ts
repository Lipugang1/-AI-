import { WebSocket, type WebSocketServer } from 'ws';

// 语音房间用户
interface VoiceUser {
  ws: WebSocket;
  userId: string;
  userName: string;
  roomId: string;
  muted: boolean;
}

// 活跃的语音房间
const rooms = new Map<string, Map<string, VoiceUser>>();

export function setupVoiceHandler(wss: WebSocketServer) {
  console.log('[Voice] WebSocket Audio Relay Server initialized');

  wss.on('connection', (ws: WebSocket) => {
    let currentUser: VoiceUser | null = null;

    ws.on('message', (raw) => {
      try {
        const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
        
        // 检查是否是文本消息（JSON 以 { 开头，ASCII 123）
        const firstByte = buffer[0];
        const isTextMessage = firstByte === 0x7B; // '{' 的 ASCII 码
        
        if (isTextMessage) {
          // 文本消息 = 信令
          const msgStr = buffer.toString('utf-8');
          const msg = JSON.parse(msgStr);
          
          switch (msg.type) {
            case 'ping': {
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            }
            
            case 'join': {
              const { roomId, userId, userName } = msg.payload;
              
              if (!rooms.has(roomId)) {
                rooms.set(roomId, new Map());
              }
              const room = rooms.get(roomId)!;
              
              // 通知已有用户
              const existingUsers = Array.from(room.values()).map(u => ({
                userId: u.userId,
                userName: u.userName,
                muted: u.muted,
              }));
              
              ws.send(JSON.stringify({
                type: 'room-users',
                payload: { users: existingUsers },
              }));

              // 通知其他用户
              room.forEach((user) => {
                if (user.ws.readyState === WebSocket.OPEN) {
                  user.ws.send(JSON.stringify({
                    type: 'user-joined',
                    payload: { userId, userName, muted: false },
                  }));
                }
              });

              currentUser = { ws, userId, userName, roomId, muted: false };
              room.set(userId, currentUser);
              
              console.log(`[Voice] User ${userName} joined room ${roomId}, total: ${room.size}`);
              break;
            }
            
            case 'leave': {
              if (currentUser) leaveRoom(currentUser);
              break;
            }
            
            case 'mute': {
              if (currentUser) {
                currentUser.muted = true;
                broadcast(currentUser.roomId, { type: 'user-muted', payload: { userId: currentUser.userId } }, currentUser.userId);
              }
              break;
            }
            
            case 'unmute': {
              if (currentUser) {
                currentUser.muted = false;
                broadcast(currentUser.roomId, { type: 'user-unmuted', payload: { userId: currentUser.userId } }, currentUser.userId);
              }
              break;
            }
          }
        } else {
          // 二进制消息 = 音频数据
          if (!currentUser) return;
          if (currentUser.muted) return;
          
          const room = rooms.get(currentUser.roomId);
          if (!room) return;
          
          // 转发给房间内其他用户（静默转发，不输出日志）
          room.forEach((user) => {
            if (user.userId !== currentUser!.userId && user.ws.readyState === WebSocket.OPEN) {
              // 添加发送者ID前缀
              const userIdBuffer = Buffer.from(currentUser!.userId, 'utf-8');
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
      if (currentUser) {
        leaveRoom(currentUser);
      }
    });

    function leaveRoom(user: VoiceUser) {
      const room = rooms.get(user.roomId);
      if (!room) return;

      room.delete(user.userId);
      broadcast(user.roomId, { type: 'user-left', payload: { userId: user.userId } }, null);

      if (room.size === 0) {
        rooms.delete(user.roomId);
      }

      console.log(`[Voice] User ${user.userName} left, remaining: ${room.size}`);
    }
    
    function broadcast(roomId: string, message: object, excludeUserId: string | null) {
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
