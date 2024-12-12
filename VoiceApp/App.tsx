import React, { useRef, useState } from 'react';
import GoogleSpeechStreamer, { GoogleSpeechStreamerHandle } from './src/GoogleSpeechStreamer';

const App: React.FC = () => {
    const [transcript, setTranscript] = useState('');
    const speechStreamerRef = useRef<GoogleSpeechStreamerHandle>(null);

    const handleTranscript = (text: string, isFinal: boolean) => {
        setTranscript((prev) => (isFinal ? `${prev} ${text}` : prev));
    };

    const handleStart = () => {
        speechStreamerRef.current?.start();
    };

    const handleStop = () => {
        speechStreamerRef.current?.stop();
    };

    return (
        <div>
            <h1>Speech Recognition</h1>
            <GoogleSpeechStreamer ref={speechStreamerRef} onTranscript={handleTranscript} />
            <button onClick={handleStart}>Start</button>
            <button onClick={handleStop}>Stop</button>
            <div>
                <h2>Transcript:</h2>
                <p>{transcript}</p>
            </div>
        </div>
    );
};

export default App;
