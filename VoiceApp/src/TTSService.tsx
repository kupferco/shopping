import React, { useEffect, useRef } from 'react';
import { useWebSocket } from './WebSocketManager';

const TTSService: React.FC<{
    audioStream: MediaStream | null; // Receive the existing audio stream
    onReady?: (controls: { stop: () => void }) => void;
}> = ({ audioStream, onReady }) => {
    const { registerHandler } = useWebSocket();
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null); // For audio analysis
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null); // Track the current playback node
    // const isInitializedRef = useRef(false); // Prevent redundant initialization

    const stopRef = useRef(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current = null;
            console.log('Audio playback stopped.');
        }
    });

    useEffect(() => {
        // Initialize AudioContext
        const initAudioContext = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext initialized.');
            }
        };

        // Function to play audio
        const playAudio = async (audioBlob: Blob) => {
            if (!audioContextRef.current) {
                console.error('AudioContext is not initialized. Waiting for initialization...');
                initAudioContext(); // Try to initialize again
                return; // Skip playback until initialized
            }
        
            try {
                const arrayBuffer = await audioBlob.arrayBuffer();
                const decodedData = await audioContextRef.current.decodeAudioData(arrayBuffer);
        
                // Stop any current playback before starting a new one
                if (sourceNodeRef.current) {
                    console.log('Stopping current playback before starting new audio.');
                    sourceNodeRef.current.stop(0);
                    sourceNodeRef.current.disconnect();
                    sourceNodeRef.current = null;
                } else {
                    console.log('No sourceNodeRef.current', sourceNodeRef.current);

                }
        
                const source = audioContextRef.current.createBufferSource();
                source.buffer = decodedData;
                source.connect(audioContextRef.current.destination);
                source.start(0);
        
                console.log('Audio playback started.');
                sourceNodeRef.current = source;
        
                source.onended = () => {
                    console.log('Audio playback ended.');
                    // sourceNodeRef.current = null;
                };
            } catch (err) {
                console.error('Audio playback error:', err);
            }
        };
        

        // Expose stop method
        const stop = () => {
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
                sourceNodeRef.current = null;
                console.log('Audio playback stopped.');
            }
        };

        // Notify the parent when the service is ready
        if (onReady) {
            onReady({ stop: stopRef.current });
        }

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
                    console.log('PLAY TTS!!!')
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

        // Cleanup resources
        return () => {
            console.log('Cleaning up resources...');
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            document.body.removeEventListener('click', initAudioContext);
        };
    }, [registerHandler]);

    useEffect(() => {
        const monitorMic = () => {
            if (!audioStream || !audioContextRef.current) {
                // console.error('AudioStream or AudioContext is not available.');
                return;
            }

            const micSource = audioContextRef.current.createMediaStreamSource(audioStream);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;

            micSource.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const logMicData = () => {
                analyser.getByteFrequencyData(dataArray);

                // Calculate average volume
                const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

                // Threshold for speech detection
                const isSpeech = avgVolume > 50; // Adjust based on testing

                if (isSpeech) {
                    console.log('Detected speech!!!!')
                    stopRef.current();
                }

                // console.log(`Mic average volume: ${avgVolume}`); // Debugging log
                requestAnimationFrame(logMicData);
            };

            logMicData(); // Start logging
        };


        monitorMic();
        // if (audioStream && audioContextRef.current) {
        //     console.log('AudioContext and AudioStream are ready. Starting mic monitoring...');
        //     monitorMic();
        // } else {
        //     console.log('Waiting for AudioStream and AudioContext to be ready...');
        //     // retryInterval = setInterval(monitorMic, 100); // Retry every 100ms
        // }
    }, [audioStream]);

    return null;
};

export default TTSService;