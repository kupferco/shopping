const fs = require('fs');
const path = require('path');

// Load system prompts from JSON
const promptsPath = path.join(__dirname, 'systemPrompts.json');
const systemPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));

const conversationHistories = {}; // Map sessionId to its conversation history

function getSystemPrompt(sessionId) {
    return systemPrompts[sessionId] || systemPrompts.default;
}

function setSystemPrompt(sessionId, newPrompt) {
    clearHistory(sessionId);
    systemPrompts[sessionId] = newPrompt;

    // Save updates to the JSON file
    // fs.writeFileSync(promptsPath, JSON.stringify(systemPrompts, null, 2));
}

function getHistory(sessionId) {
    if (!conversationHistories[sessionId]) {
        // Initialize a new history if none exists for the session
        conversationHistories[sessionId] = [
            {
                role: 'system',
                text: getSystemPrompt(sessionId),
            },
        ];
    }
    return conversationHistories[sessionId];
}

function addMessage(sessionId, message) {
    const history = getHistory(sessionId);
    history.push(message);
}

function clearHistory(sessionId) {
    conversationHistories[sessionId] = [
        {
            role: 'system',
            text: getSystemPrompt(sessionId),
        },
    ];
}

module.exports = {
    getHistory,
    addMessage,
    clearHistory,
    getSystemPrompt,
    setSystemPrompt,
};
