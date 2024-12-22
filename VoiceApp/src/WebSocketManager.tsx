import React, { createContext, useRef, useEffect, useCallback } from 'react';
import { getSessionId } from './sessionManager';
import { API_URL } from '@env';

interface WebSocketContextProps {
    sendMessage: (message: any) => void;
    registerHandler: (action: string, handler: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextProps | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<{ [action: string]: (data: any) => void }>({});
    const sessionId = getSessionId();

    useEffect(() => {
        const WEBSOCKET_ADDRESS = `${API_URL.replace(/^https/, 'wss')}`;
        wsRef.current = new WebSocket(WEBSOCKET_ADDRESS);

        wsRef.current.onopen = () => {
            console.log('WebSocket connected.');
            // Send sessionId as the first message
            if (sessionId) {
                wsRef.current?.send(JSON.stringify({ action: 'start_session', sessionId }));
            }
        }
        wsRef.current.onmessage = async (event) => {
            // console.log('WebSocket message received:', event.data);

            if (event.data instanceof Blob) {
                // console.log(`Action: tts_audio, Payload:`, event.data);
                // Pass the raw blob to the registered handler
                if (handlersRef.current['tts_audio']) {
                    handlersRef.current['tts_audio'](event.data);
                }
            } else if (typeof event.data === 'string') {
                // Handle JSON message
                try {
                    const { action, payload } = JSON.parse(event.data);
                    console.log(`Action: ${action}, Payload:`, payload);

                    if (handlersRef.current[action]) {
                        handlersRef.current[action](payload);
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            } else {
                console.warn('Unexpected WebSocket message type:', typeof event.data);
            }
        };

        wsRef.current.onerror = (error) => console.error('WebSocket error:', error);
        wsRef.current.onclose = () => console.log('WebSocket disconnected.');

        return () => wsRef.current?.close();
    }, []);

    // const sendMessage = useCallback((message: any) => {
    //     if (wsRef.current?.readyState === WebSocket.OPEN) {
    //         wsRef.current.send(message?.payload || JSON.stringify(message));
    //     } else {
    //         console.error('WebSocket is not open.');
    //     }
    // }, [sessionId]);

    const sendMessage = useCallback((message: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const messageWithSession = {
                ...message,
                sessionId, // Include sessionId in every message
            };
            wsRef.current.send(message?.payload || JSON.stringify(messageWithSession));
        } else {
            console.error('WebSocket is not open.');
        }
    }, [sessionId]);

    const registerHandler = useCallback((action: string, handler: (data: any) => void) => {
        handlersRef.current[action] = handler;
    }, []);

    return (
        <WebSocketContext.Provider value={{ sendMessage, registerHandler }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = (): WebSocketContextProps => {
    const context = React.useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
