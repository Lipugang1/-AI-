'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RecordingState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
}

interface RecordingContextType {
  recording: RecordingState;
  setRecording: (state: Partial<RecordingState>) => void;
  resetRecording: () => void;
}

const initialRecording: RecordingState = {
  isRecording: false,
  audioBlob: null,
  audioUrl: null,
  duration: 0,
};

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [recording, setRecordingState] = useState<RecordingState>(initialRecording);

  const setRecording = useCallback((state: Partial<RecordingState>) => {
    setRecordingState(prev => ({ ...prev, ...state }));
  }, []);

  const resetRecording = useCallback(() => {
    setRecordingState(initialRecording);
  }, []);

  return (
    <RecordingContext.Provider value={{ recording, setRecording, resetRecording }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}
