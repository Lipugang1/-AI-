// WebSocket 消息类型
export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
}

// WebSocket 连接选项
export interface WsOptions {
  path: string;           // 例如 '/ws/voice'
  onMessage: (msg: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;    // 默认: true
  heartbeatMs?: number;   // 默认: 30000
}

// 创建 WebSocket 连接
export function createWsConnection(opts: WsOptions): { send: (msg: WsMessage) => void; close: () => void } {
  const { path, onMessage, onOpen, onClose, reconnect = true, heartbeatMs = 30000 } = opts;
  let ws: WebSocket;
  let heartbeatTimer: ReturnType<typeof setInterval>;
  let closed = false;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}${path}`);

    ws.onopen = () => {
      heartbeatTimer = setInterval(() => ws.send(JSON.stringify({ type: 'ping', payload: null })), heartbeatMs);
      onOpen?.();
    };

    ws.onmessage = (e) => {
      const msg: WsMessage = JSON.parse(e.data);
      if (msg.type === 'pong') return;
      onMessage(msg);
    };

    ws.onclose = () => {
      clearInterval(heartbeatTimer);
      onClose?.();
      if (reconnect && !closed) setTimeout(connect, 1000);
    };
  }

  connect();

  return {
    send: (msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg)),
    close: () => { closed = true; ws.close(); },
  };
}
