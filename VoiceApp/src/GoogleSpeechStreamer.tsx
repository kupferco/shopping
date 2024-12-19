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
}

const GoogleSpeechStream: React.FC<GoogleSpeechStreamProps> = ({ onTranscript, onReady, onMuteChange }) => {
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
                    // console.log('Sending audio data to WebSocket.');
                    sendMessage({ action: 'stt_audio', payload: event.data });
                }
            };

            mediaRecorder.start(250); // Send data every 250ms
            console.log('Recording started.');
        } catch (error) {
            console.error('Failed to start recording:', error);
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