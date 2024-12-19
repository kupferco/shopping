import React, { useEffect } from 'react';
import { useWebSocket } from './WebSocketManager';

const TTSService: React.FC = () => {
    const { registerHandler } = useWebSocket();

    useEffect(() => {
        // Register the handler for tts_audio
        registerHandler('tts_audio', async (blob: Blob) => {
            // console.log('Received raw TTS data (Blob).');

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
                // console.log('Metadata:', metadata);

                if (metadata.action === 'tts_audio') {
                    // Process and play the audio
                    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);

                    audio.play()
                        .then(() => console.log('Audio playback started.'))
                        .catch((err) => console.error('Audio playback error:', err));
                } else {
                    console.warn('Unknown action:', metadata.action);
                }
            } catch (err) {
                console.error('Error parsing metadata:', err);
            }
        });
    }, [registerHandler]);

    return null;
};

export default TTSService;
