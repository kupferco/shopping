import React, { useState, useCallback, useRef, useEffect } from 'react';
import { initializeSession, renewSessionId } from './src/SessionManager';
import { useWebSocket } from './src/WebSocketManager';
import GoogleSpeechStream from './src/GoogleSpeechStreamer';
import TTSService from './src/TTSService';
import { API_URL, NODE_ENV } from '@env';
import { fetchHistory, fetchPrompt, savePrompt, clearHistory } from './src/PromptService';
import TextConversation from './src/TextConversation';

console.log(`Environment: ${NODE_ENV}`);
console.log(`API URL: ${API_URL}`);

const App: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const ttsRef = useRef<{ stop: () => void } | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [conversationHistory, setConversationHistory] = useState<{ role: string; text: string }[]>([]);

  const streamControls = useRef<{
    start: () => void;
    stop: () => void;
    toggleMute: () => void;
    isMuted: () => boolean;
  } | null>(null);

  const { restartSession, registerHandler } = useWebSocket();

  // Reusable method to refresh history
  const refreshHistory = useCallback(async () => {
    if (!sessionId) {
      console.warn("No session ID available to refresh history.");
      return;
    }

    try {
      const history = await fetchHistory(sessionId);
      console.log("Fetched conversation history:", history);
      setConversationHistory(history);
    } catch (error) {
      console.error("Error fetching conversation history:", error);
    }
  }, [sessionId]);

  useEffect(() => {
    const initSession = async () => {
      const id = initializeSession();
      setSessionId(id);

      if (id) {
        await refreshHistory(); // Use reusable method
        fetchPrompt(id, setPrompt);
      }
    };

    initSession();
  }, [refreshHistory]);

  useEffect(() => {
    if (!sessionId) return;

    const handleGeminiResponse = async () => {
      await refreshHistory(); // Use reusable method
    };

    registerHandler('gemini', handleGeminiResponse);

    return () => {
      registerHandler('gemini', () => {}); // Unregister the handler
    };
  }, [sessionId, registerHandler, refreshHistory]);

  const handleClearHistory = async () => {
    if (sessionId) {
      await clearHistory(sessionId);
      setConversationHistory([]); // Clear UI conversation
    }
  };

  const handleRenewSession = () => {
    const newSessionId = renewSessionId();
    setSessionId(newSessionId);
    console.log('Session renewed with new ID:', newSessionId);
    restartSession();
  };

  const handleTranscript = useCallback(
    async (newTranscript: string, isFinal: boolean) => {
      console.log("handleTranscript triggered");
      console.log("Session ID:", sessionId);

      if (!sessionId) {
        console.warn("Session ID is missing, skipping handleTranscript.");
        return;
      }

      if (isFinal || true) {
        console.log("Transcript received:", newTranscript);

        // Add the user's message to the conversation history
        setConversationHistory((prev) => [
          ...prev,
          { role: "user", text: newTranscript },
          { role: "assistant", text: "Loading..." }, // Placeholder for agent's response
        ]);

        await refreshHistory(); // Use reusable method
      }
    },
    [sessionId, refreshHistory]
  );

  const handleMuteChange = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  const handleReady = useCallback((controls: typeof streamControls.current) => {
    streamControls.current = controls;
  }, []);

  const handleAudioStreamReady = (stream: MediaStream | null) => {
    setAudioStream(stream);
  };

  const handleStart = () => {
    if (streamControls.current) {
      streamControls.current.start();
      setIsMicOn(true);
    } else {
      console.error('Stream controls are not initialized.');
    }
  };

  const handleStop = () => {
    if (streamControls.current) {
      streamControls.current.stop();
      setIsMicOn(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', position: 'sticky', top: 0, background: '#fff', zIndex: 100 }}>
        <p>Your session ID: {sessionId || 'No active session'}</p>
        <button onClick={handleClearHistory}>Clear conversation history</button>
        <button onClick={handleRenewSession} disabled={isMicOn}>Renew session</button>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter new system prompt"
          style={{ width: '100%', height: '50px', marginBottom: '5px' }}
        />
        <button onClick={() => savePrompt(prompt, sessionId)} disabled={isMicOn}>Save instruction prompt</button>
        <br /><br />
        <button onClick={handleStart} disabled={isMicOn}>Start</button>
        <button onClick={handleStop} disabled={!isMicOn}>Stop</button>
        <button onClick={handleMute} disabled={!isMicOn}>{isMuted ? 'Unmute' : 'Mute'}</button>
        <button onClick={handleStopTTS} disabled={!isMicOn}>Interrupt TTS</button>
      </div>
      <TextConversation
        sessionId={sessionId}
        history={conversationHistory}
      />
      <GoogleSpeechStream
        onTranscript={handleTranscript}
        onReady={handleReady}
        onMuteChange={handleMuteChange}
        onAudioStreamReady={handleAudioStreamReady}
      />
      <TTSService audioStream={audioStream} onReady={handleTTSReady} />
    </div>
  );
};

export default App;
