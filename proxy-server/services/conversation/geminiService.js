const fetch = require('node-fetch');

const fetchGeminiResponse = async (sessionId, serverEndpoint, text) => {
    try {
        const response = await fetch(`${serverEndpoint}/api/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, inputText: text }),
        });
        
        if (!response.ok) {
            console.error('Failed to fetch Gemini response (service):', response.statusText);
            console.error('ServerEdnpoint', serverEndpoint);
            return null;
        }

        const jsonResponse = await response.json();

        console.log("Gemini response (service):", jsonResponse);

        return jsonResponse;
    } catch (error) {
        console.error('Error fetching Gemini response:', error);
        return null;
    }
};

module.exports = {
    fetchGeminiResponse,
};
