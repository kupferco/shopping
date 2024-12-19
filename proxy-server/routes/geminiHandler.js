const axios = require('axios');

const USE_MOCK_GEMINI = true; // Set to false to use the real Gemini API

async function handleGeminiRequest(req, res) {
    const { inputText } = req.body;

    if (USE_MOCK_GEMINI) {
        // Mock Gemini logic
        console.log('Using mock Gemini response...');
        const mockResponse = `Echoing: ${inputText}`;

        // Simulate a random delay between 100 and 2000 ms
        const randomDelay = Math.floor(Math.random() * (2000 - 100 + 1)) + 100;
        await new Promise(resolve => setTimeout(resolve, randomDelay));

        res.json({ response: mockResponse });
    } else {
        // Real Gemini logic
        try {
            console.log('Calling real Gemini API...');
            const response = await axios.post('https://real-gemini-api-endpoint.com', {
                input: inputText,
            });

            res.json(response.data);
        } catch (err) {
            console.error('Error communicating with Gemini API:', err);
            res.status(500).send('Error communicating with Gemini API');
        }
    }
}

module.exports = {
    handleGeminiRequest,
};
