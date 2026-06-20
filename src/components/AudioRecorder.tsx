'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Play, Pause, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob, audioBase64: string) => void;
  persistent?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
}

export function AudioRecorder({ onAudioReady, persistent = false, onRecordingChange }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // 转换为 base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onAudioReady(audioBlob, base64);
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingChange?.(true);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  }, [onAudioReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      onRecordingChange?.(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording, onRecordingChange]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl!);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [audioUrl, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearRecording = () => {
    setAudioUrl(null);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  // persistent 模式下，录音时不渲染组件（状态由父组件管理）
  if (persistent && !isRecording && !audioUrl) {
    return null;
  }

  // persistent 悬浮模式
  if (persistent && isRecording) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg rounded-full px-6 py-3 flex items-center gap-4 border-2 border-red-200">
        <div className="flex items-center gap-2 text-red-500">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-medium">录音中 {formatTime(recordingTime)}</span>
        </div>
        <Button
          onClick={stopRecording}
          size="sm"
          variant="outline"
          className="border-red-500 text-red-500 hover:bg-red-50"
        >
          <Square className="mr-1 h-4 w-4" />
          停止
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <>
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  开始录音
                </Button>
                {audioUrl && (
                  <>
                    <Button onClick={togglePlayPause} variant="outline">
                      {isPlaying ? (
                        <Pause className="mr-2 h-4 w-4" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      {isPlaying ? '暂停' : '播放'}
                    </Button>
                    <Button onClick={clearRecording} variant="outline">
                      清除录音
                    </Button>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-red-500 font-bold">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  录音中 {formatTime(recordingTime)}
                </div>
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  <Square className="mr-2 h-5 w-5" />
                  停止录音
                </Button>
              </div>
            )}
          </div>
          {audioUrl && !isRecording && (
            <audio controls src={audioUrl} className="w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
