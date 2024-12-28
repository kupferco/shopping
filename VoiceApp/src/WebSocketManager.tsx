import React, { createContext, useRef, useEffect, useCallback } from 'react';
import { getSessionId, initializeSession } from './SessionManager';
import { API_URL, NODE_ENV } from '@env';

console.log(`Environment: ${NODE_ENV}`);
console.log(`API URL: ${API_URL}`);


interface WebSocketContextProps {
    sendMessage: (message: any) => void;
    registerHandler: (action: string, handler: (data: any) => void) => void;
    restartSession: () => void; // New method to restart session
}

const WebSocketContext = createContext<WebSocketContextProps | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<{ [action: string]: (data: any) => void }>({});
    const sessionIdRef = useRef<string | null>(getSessionId()); // Use ref to track session ID

    const connectWebSocket = useCallback(() => {
        const WEBSOCKET_ADDRESS = `${API_URL.replace(/^https/, 'wss')}`;
        wsRef.current = new WebSocket(WEBSOCKET_ADDRESS);

        wsRef.current.onopen = () => {
            console.log('WebSocket connected.');
            // Send sessionId as the first message
            if (sessionIdRef.current) {
                wsRef.current?.send(JSON.stringify({ action: 'start_session', sessionId: sessionIdRef.current }));
            }
        };

        wsRef.current.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                if (handlersRef.current['tts_audio']) {
                    handlersRef.current['tts_audio'](event.data);
                }
            } else if (typeof event.data === 'string') {
                try {
                    const { action, payload } = JSON.parse(event.data);
                    if (handlersRef.current[action]) {
                        handlersRef.current[action](payload);
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            }
        };

        wsRef.current.onerror = (error) => console.error('WebSocket error:', error);
        wsRef.current.onclose = () => console.log('WebSocket disconnected.');
    }, []);

    useEffect(() => {
        connectWebSocket();

        return () => wsRef.current?.close();
    }, [connectWebSocket, sessionIdRef.current]); // Reconnect when sessionId changes

    const sendMessage = useCallback((message: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const messageWithSession = {
                ...message,
                sessionId: sessionIdRef.current, // Include sessionId in every JSON message
            };
            wsRef.current.send(JSON.stringify(messageWithSession));
        } else {
            console.error('WebSocket is not open.');
        }
    }, []);

    const registerHandler = useCallback((action: string, handler: (data: any) => void) => {
        handlersRef.current[action] = handler;
    }, []);

    const restartSession = useCallback(() => {
        if (!wsRef.current) {
            console.error('WebSocket is not initialized. Cannot restart session.');
            return;
        }

        console.log('Restart connetion!!!')

        const newSessionId = initializeSession();
        sessionIdRef.current = newSessionId;
        wsRef.current.send(JSON.stringify({ action: 'restart_session', sessionId: newSessionId }));
        console.log('Session restarted with new ID:', newSessionId);
    }, []);

    return (
        <WebSocketContext.Provider value={{ sendMessage, registerHandler, restartSession }}>
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
