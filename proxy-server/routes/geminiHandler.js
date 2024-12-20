require('dotenv').config();

// Store the conversation history in memory (useful for keeping track during a session)
let conversationHistory = [
    {
        role: 'system',
        text: `You are a helpful and concise AI assistant. Your responses should be short, informative, and avoid unnecessary details.`,
    },
];

// Function to clear the conversation history
function clearHistory() {
    conversationHistory = [
        {
            role: 'system',
            text: `You are a helpful and concise AI assistant. Your responses should be short, informative, and avoid unnecessary details.`,
        },
    ];
}

async function handleGeminiRequest(req, res) {
    const { inputText, clear } = req.body;

    if (clear) {
        // Clear the conversation history if requested
        clearHistory();
        return res.json({ message: 'Conversation history cleared.' });
    }

    // Add user input to conversation history
    conversationHistory.push({ role: 'user', text: inputText });

    const useMockGemini = process.env.USE_MOCK_GEMINI === 'true';

    if (useMockGemini) {
        // Mock Gemini logic
        console.log('Using mock Gemini response...');
        const mockResponse = `${inputText}`;

        // Add mock response to conversation history
        conversationHistory.push({ role: 'assistant', text: mockResponse });

        // Simulate a random delay between 100 and 2000 ms
        const randomDelay = Math.floor(Math.random() * (2000 - 100 + 1)) + 100;
        await new Promise(resolve => setTimeout(resolve, randomDelay));

        return res.json({ response: mockResponse });
    } else {
        // Real Gemini logic
        try {
            console.log('Calling real Gemini API...');
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

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                console.error('Failed to fetch Gemini response:', response.statusText);
                return res.status(response.status).send('Error communicating with Gemini API');
            }

            const data = await response.json();
            const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No valid response from Gemini API.';

            // Add AI response to conversation history
            conversationHistory.push({ role: 'assistant', text: aiResponse });

            return res.json({ response: aiResponse });
        } catch (err) {
            console.error('Error communicating with Gemini API:', err);
            return res.status(500).send('Error communicating with Gemini API');
        }
    }
}

async function handleGeminiHistoryRequest(req, res) {
    try {
        res.json(conversationHistory);
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).send('Error fetching conversation history');
    }
}

module.exports = {
    handleGeminiRequest,
    handleGeminiHistoryRequest,
    clearHistory,
};
