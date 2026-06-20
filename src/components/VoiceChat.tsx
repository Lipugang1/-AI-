'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Phone, PhoneOff, Users, Volume2, VolumeX, Radio, AlertCircle } from 'lucide-react';
import { useVoiceChat } from '@/lib/use-voice-chat';

interface VoiceChatPanelProps {
  roomId: string;
  teamName?: string;
}

export function VoiceChatPanel({ roomId, teamName }: VoiceChatPanelProps) {
  const [inputName, setInputName] = useState('');
  const [myName, setMyName] = useState('');
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  
  const {
    connected,
    muted,
    remoteUsers,
    toggleMute,
    joinRoom,
    leaveRoom,
    error,
  } = useVoiceChat(roomId);

  // 解锁移动端音频（必须由用户交互触发）
  const unlockAudio = async () => {
    try {
      // 创建并立即播放一个静音音频
      const ctx = new AudioContext();
      await ctx.resume();
      
      // 创建静音振荡器
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      
      setAudioUnlocked(true);
      console.log('[VoiceUI] Audio unlocked successfully');
      
      // 也尝试播放一个真实的音频文件
      const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      await audio.play().catch(() => {});
    } catch (err) {
      console.error('[VoiceUI] Failed to unlock audio:', err);
    }
  };

  useEffect(() => {
    // 每次点击页面都尝试解锁
    const handler = () => {
      if (connected && !audioUnlocked) {
        unlockAudio();
      }
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [connected, audioUnlocked]);

  const handleJoin = async () => {
    if (!inputName.trim()) {
      alert('请输入您的姓名');
      return;
    }
    const name = inputName.trim();
    setMyName(name);
    await joinRoom(name);
  };

  const handleLeave = () => {
    leaveRoom();
    setMyName('');
    setInputName('');
    setAudioUnlocked(false);
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 max-w-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-600 text-sm font-medium">无法加入语音</p>
              <p className="text-red-500 text-xs mt-1">{error}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3" 
            onClick={() => {
              setMyName('');
              setInputName('');
            }}
          >
            重新尝试
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!myName) {
    return (
      <Card className="max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-blue-600" />
            实时语音对讲
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teamName && (
            <div className="text-sm text-gray-600">
              房间: <span className="font-medium">{teamName}</span>
            </div>
          )}
          <div>
            <Label htmlFor="voice-name">请输入您的姓名</Label>
            <Input
              id="voice-name"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="您的姓名"
              className="mt-1"
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <Button onClick={handleJoin} className="w-full" disabled={!inputName.trim()}>
            <Phone className="h-4 w-4 mr-2" />
            加入语音房间
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${connected ? 'text-green-500' : 'text-gray-400'}`} />
            实时语音对讲
          </span>
          {connected && (
            <Badge variant="default" className="bg-green-500">
              通话中
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {teamName && (
          <div className="text-sm text-gray-600">
            房间: <span className="font-medium">{teamName}</span>
          </div>
        )}

        {/* 参与者列表 */}
        <div className="space-y-2">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Users className="h-3 w-3" />
            参与者 ({remoteUsers.length + 1}人)
          </div>
          <div className="flex flex-wrap gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
              muted ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
            }`}>
              {muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              <span>{myName} (我)</span>
            </div>
            
            {remoteUsers.map(user => (
              <div
                key={user.userId}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all duration-300 ${
                  user.muted 
                    ? 'bg-gray-100 text-gray-500' 
                    : user.speaking 
                      ? 'bg-green-200 text-green-800 shadow-sm' 
                      : 'bg-green-100 text-green-700'
                }`}
              >
                {user.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                <span>{user.userName}</span>
                {user.speaking && (
                  <span className="w-2 h-2 bg-green-600 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {!connected && (
          <div className="text-center text-gray-500 text-sm py-2">
            正在连接...
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={toggleMute}
            variant={muted ? 'destructive' : 'outline'}
            className="flex-1 h-12 text-base"
          >
            {muted ? (
              <>
                <MicOff className="h-5 w-5 mr-2" />
                已静音
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                静音
              </>
            )}
          </Button>
          <Button onClick={handleLeave} variant="destructive" className="flex-1 h-12 text-base">
            <PhoneOff className="h-5 w-5 mr-2" />
            离开
          </Button>
        </div>

        {/* 激活音频按钮 - 放在最下面，避免误触上面按钮 */}
        {connected && !audioUnlocked && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">需要激活音频播放</p>
                <p className="text-xs text-yellow-600">点击下方按钮激活，才能听到对方声音</p>
              </div>
            </div>
            <Button 
              size="lg" 
              className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-white text-base"
              onClick={unlockAudio}
            >
              <Volume2 className="h-5 w-5 mr-2" />
              点击激活音频播放
            </Button>
          </div>
        )}

        {connected && audioUnlocked && remoteUsers.length > 0 && (
          <p className="text-xs text-gray-500 text-center">
            ✅ 音频已激活，对方说话时自动播放
          </p>
        )}
      </CardContent>
    </Card>
  );
}
