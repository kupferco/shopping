// src/PromptService.js

import { API_URL } from '@env';

/**
 * Fetches the system prompt for a given session ID.
 * @param {string} sessionId - The session ID to fetch the prompt for.
 * @param {Function} setPrompt - Callback to update the prompt state.
 */
export const fetchPrompt = async (sessionId: string, setPrompt: (prompt: string) => void): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/gemini/system-prompt?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch system prompt.');
      return;
    }

    const data = await response.json();
    setPrompt(data.prompt || '');

    console.log(`${API_URL}/api/gemini/history?sessionId=${sessionId}&`)
  } catch (error) {
    console.error('Error fetching system prompt:', error);
  }
};

/**
 * Saves a new system prompt for the session.
 * @param {string} prompt - The new system prompt.
 * @param {string} sessionId - The session ID to associate the new prompt with.
 */
export const savePrompt = async (prompt: string, sessionId: string): Promise<void> => {
  if (!prompt.trim()) {
    alert('System prompt cannot be empty.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/gemini/system-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, newPrompt: prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update system prompt:', errorText);
      alert('Error updating system prompt. Check logs for details.');
      return;
    }

    const result = await response.json();
    alert(result.message); // Success message
  } catch (error) {
    console.error('Error updating system prompt:', error);
    alert('An error occurred while updating the system prompt.');
  }
};

/**
 * Clears the conversation history for a session.
 * @param {string} sessionId - The session ID to clear the history for.
 */
export const clearHistory = async (sessionId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/gemini/history?sessionId=${encodeURIComponent(sessionId)}&clear=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!response.ok) {
      console.error('Failed to clear conversation history.');
      return;
    }

    const result = await response.json();
    console.log(result.message || 'Conversation history cleared.');
  } catch (error) {
    console.error('Error clearing conversation history:', error);
  }
};

/**
 * Fetches the conversation history for a session.
 * @param {string} sessionId - The session ID to fetch the history for.
 * @returns {Promise<Array>} - A promise resolving to the conversation history.
 */
export const fetchHistory = async (sessionId: string): Promise<Array<{ sender: string; content: string }>> => {
  try {
    const response = await fetch(`${API_URL}/api/gemini/history?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch conversation history.');
      return [];
    }

    const history = await response.json();
    return history;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
};