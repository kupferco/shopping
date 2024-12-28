import React, { useEffect, useRef, useState } from 'react';
import { useWebSocket } from './WebSocketManager';

interface GoogleSpeechStreamProps {
    onTranscript: (transcript: string, isFinal: boolean) => void;
    onReady: (controlFunctions: {
        start: () => void;
        stop: () => void;
        toggleMute: () => void;
        isMuted: () => boolean;
    }) => void;
    onMuteChange: (muted: boolean) => void;
    onAudioStreamReady: (stream: MediaStream | null) => void;
}

const GoogleSpeechStream: React.FC<GoogleSpeechStreamProps> = ({ onTranscript, onReady, onMuteChange, onAudioStreamReady }) => {
    const { sendMessage, registerHandler } = useWebSocket();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const [muted, setMuted] = useState(false);
    const mutedRef = useRef(false);

    // Handle STT messages from WebSocket
    useEffect(() => {
        registerHandler('stt', ({ transcript, isFinal }) => {
            onTranscript(transcript, isFinal);
        });

        return () => {
            console.log('Cleaning up STT handler');
            registerHandler('stt', () => { });
        };
    }, [registerHandler, onTranscript]);

    const startRecording = async () => {
        try {
            console.log('Requesting microphone access...');
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone access granted.');
            audioStreamRef.current = audioStream;

            const mediaRecorder = new MediaRecorder(audioStream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (!mutedRef.current) {
                    // Convert the audio Blob to Base64
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (reader.result) {
                            const base64Audio = (reader.result as string).split(',')[1]; // Get base64 content
                            sendMessage({ action: 'stt_audio', audioData: base64Audio });
                        } else {
                            console.error('Failed to read audio data.');
                        }
                    };
                    reader.onerror = () => {
                        console.error('Error reading audio data:', reader.error);
                    };
                    reader.readAsDataURL(event.data); // Read Blob as DataURL
                }
            };

            mediaRecorder.start(250); // Send data every 250ms
            onAudioStreamReady(audioStream); // Pass to parent
            console.log('Recording started.');
        } catch (error) {
            console.error('Failed to start recording:', error);
            onAudioStreamReady(null); // Notify parent of failure
        }
    };

    const stopRecording = () => {
        console.log('Stopping recording...');
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
        }
    };

    const toggleMute = () => {
        setMuted((prevMuted) => {
            const newMuted = !prevMuted;
            mutedRef.current = newMuted;
            return newMuted;
        });
    };

    const isMuted = () => mutedRef.current;

    const start = () => {
        sendMessage({ action: 'start_stt' });
        startRecording();
    };

    const stop = () => {
        sendMessage({ action: 'stop_stt' });
        stopRecording();
    };

    useEffect(() => {
        onReady({ start, stop, toggleMute, isMuted });
        return () => stop();
    }, [onReady]);

    useEffect(() => {
        onMuteChange(muted);
    }, [muted, onMuteChange]);

    return null; // No UI rendering
};

export default GoogleSpeechStream;