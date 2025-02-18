const { getHistory, addMessage, clearHistory } = require('../services/conversation/conversationHistoryService');
const { getSystemPrompt, setSystemPrompt } = require('../services/conversation/conversationHistoryService');

async function handleGetSystemPrompt(req, res) {
    const { sessionId } = req.query;
    if (sessionId) {
        try {
            const prompt = getSystemPrompt(sessionId);
            return res.json({ prompt: prompt });
        } catch (error) {
            return res.status(404).json({ error: 'No prompt found with this sessionId' });
        }
    } else {
        return res.status(404).json({ error: 'Missing sessionId.' });
    }

}
async function updateSystemPrompt(req, res) {
    const { sessionId, newPrompt } = req.body;

    if (!sessionId || !newPrompt) {
        return res.status(400).send('Session ID and new prompt are required.');
    }

    try {
        setSystemPrompt(sessionId, newPrompt);
        return res.json({ message: 'System prompt updated successfully.' });
    } catch (error) {
        console.error('Error updating system prompt:', error);
        return res.status(500).send('Failed to update system prompt.');
    }
}

async function handleGeminiRequest(req, res) {
    const { sessionId, inputText } = req.body;

    if (!sessionId) {
        return res.status(400).send('Session ID is required.');
    }

    // Add user input to conversation history
    addMessage(sessionId, { role: 'user', text: inputText });

    const useMockGemini = process.env.USE_MOCK_GEMINI === 'true';

    if (useMockGemini) {
        // Mock Gemini logic
        console.log('Using mock Gemini response...');
        const mockResponse = `${inputText}`;

        // Add mock response to conversation history
        addMessage(sessionId, { role: 'assistant', text: mockResponse });

        // Simulate a random delay between 100 and 2000 ms
        const randomDelay = Math.floor(Math.random() * (2000 - 100 + 1)) + 100;
        await new Promise(resolve => setTimeout(resolve, randomDelay));

        return res.json({ response: mockResponse });
    } else {
        // Real Gemini logic
        try {
            console.log('Calling real Gemini API...');
            const conversationHistory = getHistory(sessionId);
            const payload = {
                contents: [
                    {
                        parts: [
                            {
                                text: conversationHistory
                                    .map((entry) => `${entry.role}: ${entry.text}`)
                                    .join('\n'),
                            },
                        ],
                    },
                ],
            };
            // In handleGeminiRequest, add this before the fetch:
            console.log('Payload:', JSON.stringify(payload, null, 2));
            console.log('API URL:', `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY.substring(0, 5)}...`);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                console.error('Failed to fetch Gemini response (geminiHandler):', response.statusText);
                return res.status(response.status).send('Error communicating with Gemini API');
            }

            const data = await response.json();
            const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No valid response from Gemini API.';

            console.log('Gemini response (geminiHandler):', aiResponse);
            // Add AI response to conversation history
            addMessage(sessionId, { role: 'assistant', text: aiResponse });

            return res.json({ response: aiResponse });
        } catch (err) {
            console.error('Error communicating with Gemini API:', err);
            return res.status(500).send('Error communicating with Gemini API');
        }
    }
}

async function handleGeminiHistoryRequest(req, res) {
    const { sessionId, clear } = req.query;

    if (!sessionId) {
        return res.status(400).send('Session ID is required.');
    }

    try {
        if (clear === 'true') {
            // Clear the conversation history if requested
            clearHistory(sessionId);
            return res.json({ message: `Conversation history cleared for session ${sessionId}` });
        }

        // Fetch the conversation history
        const history = getHistory(sessionId);
        res.json(history);
    } catch (error) {
        console.error('Error handling conversation history request:', error);
        res.status(500).send('Error handling conversation history request');
    }
}


module.exports = {
    handleGeminiRequest,
    handleGeminiHistoryRequest,
    updateSystemPrompt,
    handleGetSystemPrompt,
};
