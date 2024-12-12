import React, { useEffect, useRef, useState } from 'react';

interface GoogleSpeechStreamProps {
    onTranscript: (transcript: string, isFinal: boolean) => void;
    onReady: (controlFunctions: {
        start: () => void;
        stop: () => void;
        toggleMute: () => void;
        isMuted: () => boolean;
    }) => void;
    onMuteChange: (muted: boolean) => void; // Add this
}


const GoogleSpeechStream: React.FC<GoogleSpeechStreamProps> = ({ onTranscript, onReady, onMuteChange }) => {
    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [muted, setMuted] = useState(false);
    const mutedBufferRef = useRef<Blob[]>([]);
    const mutedRef = useRef(false);

    const toggleMute = () => {
        setMuted((prev) => {
            const newMuted = !prev;
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const action = newMuted ? 'stop' : 'start';
                console.log(`Sending WebSocket action: ${action}`);
                wsRef.current.send(JSON.stringify({ action }));
            }
            onMuteChange(newMuted);
            return newMuted;
        });
    };


    const isMuted = () => mutedRef.current; // Return the current value

    useEffect(() => {
        let audioStream: MediaStream | null = null;

        const start = async () => {
            console.log('Starting recording...');
        
            // Notify the server to start processing
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('Sending "start" action to server');
                wsRef.current.send(JSON.stringify({ action: 'start' }));
            } else {
                console.error('WebSocket is not open');
            }
        
            // Ensure previous streams are cleaned up
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current = null;
            }
        
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(audioStream);
            mediaRecorderRef.current = mediaRecorder;
        
            mediaRecorder.ondataavailable = (event) => {
                if (!mutedRef.current && wsRef.current?.readyState === WebSocket.OPEN && mediaRecorderRef.current) {
                    wsRef.current.send(event.data); // Send audio data only if MediaRecorder is active
                }
            };
                    
            mediaRecorder.start(250); // Send data every 250ms
            console.log('Recording started.');
        };
        

        const stop = () => {
            console.log('Stopping recording...');
        
            // Stop the MediaRecorder
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.ondataavailable = null; // Remove the event handler
                mediaRecorderRef.current.stop(); // Stop MediaRecorder
                mediaRecorderRef.current = null; // Clear the reference
            }
        
            // Stop all audio tracks
            if (audioStream) {
                audioStream.getTracks().forEach((track) => track.stop());
                audioStream = null;
            }
        
            // Notify the server to stop processing
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('Sending "stop" action to server');
                wsRef.current.send(JSON.stringify({ action: 'stop' }));
            }
        };
        
        
        

        const ws = new WebSocket('ws://localhost:8082');
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connection established.');
            onReady({ start, stop, toggleMute, isMuted });
        };

        ws.onmessage = (event) => {
            console.log('Received message:', event.data);
            const message = JSON.parse(event.data);
            if (message.transcript) {
                onTranscript(message.transcript, message.isFinal);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
            console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        };

        return () => {
            console.log('Cleaning up WebSocket connection...');
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [onReady, onTranscript]); // Removed `muted` from dependencies    

    return null; // This component does not render any UI
};

export default GoogleSpeechStream;
