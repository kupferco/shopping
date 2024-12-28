// src/SessionManager.js
import { v4 as uuidv4 } from 'uuid';

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

// Set a session ID with expiration time
export function setSessionIdWithExpiration(sessionId, ttl = SESSION_TTL) {
    const now = new Date().getTime();
    const expiresAt = now + ttl; // ttl is in milliseconds
    const sessionData = { sessionId, expiresAt };
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
}

// Retrieve the session ID if it’s still valid
export function getSessionId() {
    const sessionData = localStorage.getItem('sessionData');
    if (!sessionData) return null;

    const { sessionId, expiresAt } = JSON.parse(sessionData);
    const now = new Date().getTime();

    // Check if the session has expired
    if (now > expiresAt) {
        localStorage.removeItem('sessionData'); // Clean expired session
        return null;
    }

    return sessionId;
}

// Clear the session ID from localStorage
export function clearSessionId() {
    localStorage.removeItem('sessionData');
}

// Initialize or ensure a valid session
export function initializeSession() {
    let sessionId = getSessionId();
    if (!sessionId) {
        sessionId = uuidv4();
        setSessionIdWithExpiration(sessionId);
        console.log('New session ID generated:', sessionId);
    } else {
        console.log('Existing session ID restored:', sessionId);
    }
    return sessionId;
}

// Renew the session ID and store it
export function renewSessionId() {
    const newSessionId = uuidv4();
    setSessionIdWithExpiration(newSessionId);
    console.log('Session ID renewed:', newSessionId);
    return newSessionId;
}
