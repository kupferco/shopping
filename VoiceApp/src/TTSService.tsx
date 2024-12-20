import React, { useEffect, useRef } from 'react';
import { useWebSocket } from './WebSocketManager';

const TTSService: React.FC = () => {
    const { registerHandler } = useWebSocket();
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext when the component mounts
        const initAudioContext = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext initialized.');
            }
        };

        // Function to play audio using AudioContext
        const playAudio = async (audioBlob: Blob) => {
            if (!audioContextRef.current) {
                console.error('AudioContext not initialized.');
                return;
            }

            try {
                const arrayBuffer = await audioBlob.arrayBuffer();
                const decodedData = await audioContextRef.current.decodeAudioData(arrayBuffer);

                const source = audioContextRef.current.createBufferSource();
                source.buffer = decodedData;
                source.connect(audioContextRef.current.destination);
                source.start(0);

                console.log('Audio playback started.');
            } catch (err) {
                console.error('Audio playback error:', err);
            }
        };

        // Register the handler for TTS audio
        registerHandler('tts_audio', async (blob: Blob) => {
            if (!audioContextRef.current) {
                console.error('AudioContext is not initialized.');
                return;
            }

            // Convert Blob to ArrayBuffer
            const arrayBuffer = await blob.arrayBuffer();
            const combinedBuffer = new Uint8Array(arrayBuffer);

            // Find the separator (newline character)
            const separatorIndex = combinedBuffer.indexOf(10); // ASCII code for '\n'
            if (separatorIndex === -1) {
                console.error('Invalid message format: Separator not found.');
                return;
            }

            // Extract metadata and audio buffer
            const metadataBuffer = combinedBuffer.slice(0, separatorIndex);
            const audioBuffer = combinedBuffer.slice(separatorIndex + 1);

            try {
                const metadata = JSON.parse(new TextDecoder().decode(metadataBuffer));
                if (metadata.action === 'tts_audio') {
                    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                    await playAudio(audioBlob);
                } else {
                    console.warn('Unknown action:', metadata.action);
                }
            } catch (err) {
                console.error('Error parsing metadata:', err);
            }
        });

        // Ensure AudioContext is initialized with a user interaction
        document.body.addEventListener('click', initAudioContext);

        return () => {
            // Cleanup resources
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            document.body.removeEventListener('click', initAudioContext);
        };
    }, [registerHandler]);

    return null;
};

export default TTSService;
