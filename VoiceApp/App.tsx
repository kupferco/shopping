import React, { useState, useCallback, useRef } from 'react';
import { WebSocketProvider } from './src/WebSocketManager';
import GoogleSpeechStream from './src/GoogleSpeechStreamer';
import TTSService from './src/TTSService';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const ttsRef = useRef<{ speak: (text: string) => void } | null>(null);

  const streamControls = useRef<{
    start: () => void;
    stop: () => void;
    toggleMute: () => void;
    isMuted: () => boolean;
  } | null>(null);

  const handleReady = useCallback((controls: typeof streamControls.current) => {
    streamControls.current = controls;
  }, []);

  const handleTranscript = useCallback((newTranscript: string, isFinal: boolean) => {
    if (isFinal) {
      // console.log("Transcript ::", newTranscript);
      setTranscript((prev) => `${prev} ${newTranscript}`);
    }
  }, []);

  const handleMuteChange = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  const handleStart = () => {
    if (streamControls.current) {
      streamControls.current.start();
      setIsMicOn(true); // Set microphone state to on
    } else {
      console.error('Stream controls are not initialized.');
    }
  };

  const handleStop = () => {
    if (streamControls.current) {
      streamControls.current.stop();
      setIsMicOn(false); // Set microphone state to off
    } else {
      console.error('Stream controls are not initialized.');
    }
  };

  const handleMute = () => {
    if (streamControls.current) {
      streamControls.current.toggleMute();
      setIsMuted(streamControls.current.isMuted());
    } else {
      console.error('Stream controls are not initialized.');
    }
  };

  const handleTTSReady = (speak: (text: string) => void) => {
    ttsRef.current = { speak };
  };

  return (
    <WebSocketProvider>
      <div>
        <h1>Speech to Text and Text to Speech</h1>
        <p>Transcript: {transcript}</p>
        <button onClick={handleStart} disabled={isMicOn}>
          Start
        </button>
        <button onClick={handleStop} disabled={!isMicOn}>
          Stop
        </button>
        <button onClick={handleMute} disabled={!isMicOn}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <GoogleSpeechStream
          onTranscript={handleTranscript}
          onReady={handleReady}
          onMuteChange={handleMuteChange}
        />
        <TTSService />
      </div>
    </WebSocketProvider>
  );
};

export default App;
