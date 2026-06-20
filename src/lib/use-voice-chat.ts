'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

// 远程用户状态
export interface RemoteUser {
  userId: string;
  userName: string;
  muted: boolean;
  speaking: boolean;
}

// Hook 返回值
export interface VoiceChatState {
  connected: boolean;
  muted: boolean;
  remoteUsers: RemoteUser[];
  toggleMute: () => void;
  joinRoom: (userName: string) => Promise<void>;
  leaveRoom: () => void;
  error: string | null;
}

type WsMessage = {
  type: string;
  payload: unknown;
};

// 音频参数
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 256; // 减小缓冲区降低延迟 (256 = 16ms @ 16kHz)

export function useVoiceChat(roomId: string): VoiceChatState {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const myInfoRef = useRef<{ userId: string; userName: string } | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const mutedRef = useRef(false);
  const micContextRef = useRef<{ processor: ScriptProcessorNode; source: MediaStreamAudioSourceNode; ctx: AudioContext } | null>(null);
  
  // 音频播放器（每个远程用户一个）
  const audioPlayersRef = useRef<Map<string, { 
    nextPlayTime: number;
  }>>(new Map());
  
  // 音频缓冲队列
  const audioBuffersRef = useRef<Map<string, Int16Array[]>>(new Map());
  
  // speaking 状态定时器（防抖）
  const speakingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 初始化音频播放器
  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) return audioContextRef.current;
    
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    await ctx.resume();
    audioContextRef.current = ctx;
    
    // 创建一个静音的振荡器来解锁音频
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
    
    console.log('[Voice] AudioContext initialized, state:', ctx.state);
    return ctx;
  }, []);

  // 播放 Int16 PCM 音频
  const playPcmAudio = useCallback((userId: string, pcmData: Int16Array) => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      console.warn('[Voice] AudioContext not initialized');
      return;
    }
    
    if (ctx.state !== 'running') {
      console.warn('[Voice] AudioContext state:', ctx.state, '- attempting to resume');
      ctx.resume().catch(err => console.error('[Voice] Failed to resume context:', err));
      return;
    }

    // 初始化播放器状态
    if (!audioPlayersRef.current.has(userId)) {
      audioPlayersRef.current.set(userId, { nextPlayTime: 0 });
    }
    const player = audioPlayersRef.current.get(userId)!;
    
    // 转换 Int16 PCM 到 Float32
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768;
    }
    
    // 创建音频缓冲
    const audioBuffer = ctx.createBuffer(1, floatData.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(floatData);
    
    // 创建源节点
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    // 计算播放时间 - 关键优化：控制延迟
    const now = ctx.currentTime;
    const maxLatency = 0.15; // 最大允许延迟 150ms
    const bufferDuration = audioBuffer.duration;
    
    if (player.nextPlayTime < now) {
      // 如果之前的播放时间已过期
      player.nextPlayTime = now;
    } else if (player.nextPlayTime - now > maxLatency) {
      // 如果延迟超过阈值，跳过积压音频，重置为当前时间
      // 这样可以保持低延迟，代价是可能丢失一些音频
      console.log('[Voice] Latency too high, resetting. Delay:', (player.nextPlayTime - now).toFixed(3), 's');
      player.nextPlayTime = now;
    }
    
    // 立即播放（尽可能快）
    source.start(player.nextPlayTime);
    player.nextPlayTime += bufferDuration;
    
    // 防抖处理 speaking 状态
    const existingTimer = speakingTimersRef.current.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // 设置 speaking 为 true（只在状态变化时更新）
    setRemoteUsers(prev => {
      const user = prev.find(u => u.userId === userId);
      if (user && !user.speaking) {
        return prev.map(u => u.userId === userId ? { ...u, speaking: true } : u);
      }
      return prev;
    });
    
    // 1秒后清除 speaking 标志（停止说话后）
    const timer = setTimeout(() => {
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, speaking: false } : u
      ));
      speakingTimersRef.current.delete(userId);
    }, 1000);
    
    speakingTimersRef.current.set(userId, timer);
    
  }, []);

  // 加入房间
  const joinRoom = useCallback(async (userName: string) => {
    try {
      setError(null);
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      myInfoRef.current = { userId, userName };
      
      console.log('[Voice] Joining room as', userName, userId);
      
      // 初始化音频上下文
      await initAudioContext();
      
      // 获取麦克风
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
        });
        
        localStreamRef.current = stream;
        console.log('[Voice] Got microphone access');
        
        // 获取麦克风的 AudioContext
        const micCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        await micCtx.resume();
        const source = micCtx.createMediaStreamSource(stream);
        
        // 使用 ScriptProcessor（兼容性好）或 AudioWorklet
        // 这里用 ScriptProcessorNode 简化实现
        const processor = micCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
        
        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          if (mutedRef.current) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // 转换 Float32 到 Int16 PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // 发送二进制数据
          wsRef.current.send(pcmData.buffer);
        };
        
        source.connect(processor);
        processor.connect(micCtx.destination);
        
        // 保存引用用于清理
        micContextRef.current = { processor, source, ctx: micCtx };
        
        // 连接 WebSocket
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${location.host}/ws/voice`);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('[Voice] WebSocket connected');
        
        ws.send(JSON.stringify({
          type: 'join',
          payload: { roomId, userId, userName },
        }));
        
        setConnected(true);
        
        // 心跳
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };
      
      ws.onmessage = async (e) => {
        // 二进制消息 = 音频数据
        if (e.data instanceof ArrayBuffer) {
          try {
            const buffer = Buffer.from(e.data);
            
            // 解析发送者ID
            const userIdLen = buffer.readUInt8(0);
            const senderId = buffer.toString('utf-8', 1, 1 + userIdLen);
            
            // 复制 PCM 数据到新的 ArrayBuffer（确保对齐）
            const pcmStart = 1 + userIdLen;
            const pcmLength = buffer.byteLength - pcmStart;
            const pcmBuffer = new ArrayBuffer(pcmLength);
            new Uint8Array(pcmBuffer).set(new Uint8Array(buffer.buffer, buffer.byteOffset + pcmStart, pcmLength));
            const pcmData = new Int16Array(pcmBuffer);
            
            console.log('[Voice] Received audio from', senderId, 'samples:', pcmData.length, 'bytes:', buffer.byteLength);
            
            // 确保音频上下文运行
            if (audioContextRef.current?.state === 'suspended') {
              await audioContextRef.current.resume();
            }
            
            playPcmAudio(senderId, pcmData);
          } catch (err) {
            console.error('[Voice] Error playing audio:', err);
          }
          return;
        }
        
        // 文本消息 = 信令
        try {
          const msg: WsMessage = JSON.parse(e.data);
          if (msg.type === 'pong') return;
          
          switch (msg.type) {
            case 'room-users': {
              const { users } = msg.payload as { users: { userId: string; userName: string; muted: boolean }[] };
              setRemoteUsers(users.map(u => ({
                userId: u.userId,
                userName: u.userName,
                muted: u.muted,
                speaking: false,
              })));
              break;
            }
            
            case 'user-joined': {
              const { userId: newUserId, userName: newUserName } = msg.payload as { userId: string; userName: string };
              setRemoteUsers(prev => [...prev.filter(u => u.userId !== newUserId), { 
                userId: newUserId, 
                userName: newUserName, 
                muted: false,
                speaking: false,
              }]);
              break;
            }
            
            case 'user-left': {
              const { userId: leftUserId } = msg.payload as { userId: string };
              setRemoteUsers(prev => prev.filter(u => u.userId !== leftUserId));
              audioPlayersRef.current.delete(leftUserId);
              audioBuffersRef.current.delete(leftUserId);
              break;
            }
            
            case 'user-muted': {
              const { userId: mutedUserId } = msg.payload as { userId: string };
              setRemoteUsers(prev => prev.map(u => 
                u.userId === mutedUserId ? { ...u, muted: true } : u
              ));
              break;
            }
            
            case 'user-unmuted': {
              const { userId: unmutedUserId } = msg.payload as { userId: string };
              setRemoteUsers(prev => prev.map(u => 
                u.userId === unmutedUserId ? { ...u, muted: false } : u
              ));
              break;
            }
          }
        } catch (err) {
          console.error('[Voice] Error parsing message:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log('[Voice] WebSocket closed, code:', event.code);
        setConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        // 清理麦克风上下文
        if (micContextRef.current) {
          micContextRef.current.processor.disconnect();
          micContextRef.current.source.disconnect();
          if (micContextRef.current.ctx.state !== 'closed') {
            micContextRef.current.ctx.close();
          }
          micContextRef.current = null;
        }
      };
      
      ws.onerror = (err) => {
        console.error('[Voice] WebSocket error:', err);
        setError('连接失败，请重试');
      };
      
    } catch (err: unknown) {
      console.error('[Voice] Failed:', err);
      
      // 根据错误类型提供更具体的提示
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('麦克风权限被拒绝，请在浏览器地址栏左侧点击图标允许麦克风访问');
        } else if (err.name === 'NotFoundError') {
          setError('未找到麦克风设备，请确保设备已连接');
        } else if (err.name === 'NotReadableError') {
          setError('麦克风被其他应用程序占用，请关闭其他使用麦克风的应用');
        } else if (err.name === 'OverconstrainedError') {
          setError('麦克风不支持所需参数，请尝试使用其他设备');
        } else if (err.name === 'SecurityError') {
          setError('安全限制：请使用 HTTPS 或 localhost 访问');
        } else {
          setError(`麦克风访问失败: ${err.name} - ${err.message}`);
        }
      } else if (err instanceof TypeError) {
        setError('浏览器不支持麦克风访问，请使用现代浏览器');
      } else {
        setError('无法获取麦克风权限，请检查浏览器设置');
      }
    }
  }, [roomId, initAudioContext, playPcmAudio]);

  // 离开房间
  const leaveRoom = useCallback(() => {
    console.log('[Voice] Leaving room');
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // 清理麦克风上下文
    if (micContextRef.current) {
      micContextRef.current.processor.disconnect();
      micContextRef.current.source.disconnect();
      if (micContextRef.current.ctx.state !== 'closed') {
        micContextRef.current.ctx.close();
      }
      micContextRef.current = null;
    }
    
    // 清理播放音频上下文
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    
    audioPlayersRef.current.clear();
    audioBuffersRef.current.clear();
    
    // 清理 speaking 定时器
    speakingTimersRef.current.forEach(timer => clearTimeout(timer));
    speakingTimersRef.current.clear();
    
    setConnected(false);
    setRemoteUsers([]);
    setMuted(false);
    mutedRef.current = false;
  }, []);

  // 切换静音
  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    mutedRef.current = newMuted;
    
    // 静音本地音频轨道
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: newMuted ? 'mute' : 'unmute',
      }));
    }
  }, [muted]);

  // 清理
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (micContextRef.current) {
        micContextRef.current.processor.disconnect();
        micContextRef.current.source.disconnect();
        if (micContextRef.current.ctx.state !== 'closed') {
          micContextRef.current.ctx.close();
        }
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      }
      if (wsRef.current) wsRef.current.close();
      // 清理 speaking 定时器
      speakingTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    connected,
    muted,
    remoteUsers,
    toggleMute,
    joinRoom,
    leaveRoom,
    error,
  };
}
