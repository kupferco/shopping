// App.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { initializeSession, renewSessionId, clearSessionId } from './src/SessionManager';
import { useWebSocket } from './src/WebSocketManager';
import GoogleSpeechStream from './src/GoogleSpeechStreamer';
import TTSService from './src/TTSService';
import { API_URL, NODE_ENV } from '@env';
import { fetchPrompt, savePrompt, clearHistory } from './src/PromptService';

console.log(`Environment: ${NODE_ENV}`);
console.log(`API URL: ${API_URL}`);

const App: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const ttsRef = useRef<{ stop: () => void } | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(''); // State for the input field

  const streamControls = useRef<{
    start: () => void;
    stop: () => void;
    toggleMute: () => void;
    isMuted: () => boolean;
  } | null>(null);

  const { restartSession } = useWebSocket(); // Use restartSession from WebSocketManager

  useEffect(() => {
    // Initialize the session
    const id = initializeSession();
    setSessionId(id);

    if (id) {
      fetchPrompt(id, setPrompt);
    }
  }, [sessionId]);

  const handleClearHistory = async () => {
    if (sessionId) {
      await clearHistory(sessionId);
    } else {
      console.error('No active session to clear history.');
    }
  };

  const handleRenewSession = () => {
    const newSessionId = renewSessionId();
    setSessionId(newSessionId);
    console.log('Session renewed with new ID:', newSessionId);

    // Restart WebSocket session
    restartSession();
  };

  const handleAudioStreamReady = (stream: MediaStream | null) => {
    setAudioStream(stream);
  };

  const handleReady = useCallback((controls: typeof streamControls.current) => {
    streamControls.current = controls;
  }, []);

  const handleTranscript = useCallback((newTranscript: string, isFinal: boolean) => {
    if (isFinal || true) {
      console.log(newTranscript);
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
      handleStopTTS();
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

  const handleTTSReady = (controls: { stop: () => void }) => {
    ttsRef.current = controls;
  };

  const handleStopTTS = () => {
    if (ttsRef.current) {
      ttsRef.current.stop();
    } else {
      console.error('TTS controls are not initialized.');
    }
  };

  return (
    <div>
      <div>
        <h1>Welcome to the Voice App</h1>
        <p>Your session ID: {sessionId || 'No active session'}</p>
        <button
          onClick={handleClearHistory}
          >Clear conversation history</button>
        <button
          onClick={handleRenewSession}
          disabled={isMicOn}>Renew session</button>
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter new system prompt"
            style={{ width: '100%', height: '50px' }}
          />
          <button
            onClick={() => savePrompt(prompt, sessionId)}
            disabled={isMicOn}>Save instruction prompt</button>
        </div>
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
        <button onClick={handleStopTTS} disabled={!isMicOn}>Interrrupt TTS</button>
        <GoogleSpeechStream
          onTranscript={handleTranscript}
          onReady={handleReady}
          onMuteChange={handleMuteChange}
          onAudioStreamReady={handleAudioStreamReady}
        />
        <TTSService audioStream={audioStream} onReady={handleTTSReady} />
      </div>
    </div>
  );
};

export default App;
