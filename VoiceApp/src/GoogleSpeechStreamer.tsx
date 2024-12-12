import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface GoogleSpeechStreamerProps {
    onTranscript: (transcript: string, isFinal: boolean) => void;
}

export interface GoogleSpeechStreamerHandle {
    start: () => void;
    stop: () => void;
}

const GoogleSpeechStreamer = forwardRef<GoogleSpeechStreamerHandle, GoogleSpeechStreamerProps>(
    ({ onTranscript }, ref) => {
        const wsRef = useRef<WebSocket | null>(null);
        const mediaRecorderRef = useRef<MediaRecorder | null>(null);

        // Expose start and stop methods to parent via ref
        useImperativeHandle(ref, () => ({
            start: async () => {
                if (mediaRecorderRef.current) {
                    console.warn('Already started.');
                    return;
                }

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

                    wsRef.current = new WebSocket('ws://localhost:8082');

                    wsRef.current.onopen = () => {
                        console.log('WebSocket connection established.');
                        mediaRecorder.start(100); // Send audio chunks every 100ms
                    };

                    wsRef.current.onmessage = (event) => {
                        const message = JSON.parse(event.data);
                        console.log('Received message:', message);
                        if (message.transcript) {
                            onTranscript(message.transcript, message.isFinal);
                        }
                    };

                    wsRef.current.onerror = (error) => {
                        console.error('WebSocket error:', error);
                    };

                    wsRef.current.onclose = () => {
                        console.log('WebSocket connection closed.');
                        mediaRecorder.stop();
                    };

                    mediaRecorder.ondataavailable = (event) => {
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                            wsRef.current.send(event.data);
                        }
                    };

                    mediaRecorder.onstop = () => {
                        console.log('MediaRecorder stopped.');
                        stream.getTracks().forEach((track) => track.stop());
                    };

                    mediaRecorderRef.current = mediaRecorder;
                } catch (error) {
                    console.error('Error accessing microphone:', error);
                }
            },
            stop: () => {
                if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current = null;
                }
                if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                }
            },
        }));

        useEffect(() => {
            // Cleanup on unmount
            return () => {
                if (mediaRecorderRef.current) {
                    mediaRecorderRef.current.stop();
                }
                if (wsRef.current) {
                    wsRef.current.close();
                }
            };
        }, []);

        return null; // No UI elements in this component
    }
);

export default GoogleSpeechStreamer;
