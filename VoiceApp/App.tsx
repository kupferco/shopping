import React, { useState, useCallback, useEffect, useRef } from 'react';
import GoogleSpeechStream from './src/GoogleSpeechStreamer';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const streamControls = useRef<{
    start: () => void;
    stop: () => void;
    unmute: () => void;
    toggleMute: () => void;
    isMuted: () => boolean;
  } | null>(null);


  useEffect(() => {
    console.log('isMuted', isMuted);
  }, [isMuted]);

  const handleReady = useCallback((controls: typeof streamControls.current) => {
    streamControls.current = controls;
  }, []);


  const handleTranscript = useCallback((newTranscript: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscript((prev) => `${prev} ${newTranscript}`);
    }
  }, []);

  const handleMute = () => {
    if (streamControls.current) {
      streamControls.current.toggleMute();
      setIsMuted(streamControls.current.isMuted());
      // if (isMuted)
      //   streamControls.current?.unmute();
    } else {
      console.error('streamControls is not initialized');
    }
  };


  const handleMuteChange = (muted: boolean) => {
    setIsMuted(muted);
  };

  const handleStart = () => {
    if (streamControls.current) {
      streamControls.current.start();
      setIsMicOn(true); // Set microphone state to on
    }
  };

  const handleStop = () => {
    if (streamControls.current) {
      streamControls.current.stop();
      setIsMicOn(false); // Set microphone state to off
    }
  };

  return (
    <div>
      <h1>Speech to Text</h1>
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
    </div>
  );
};

export default App;
