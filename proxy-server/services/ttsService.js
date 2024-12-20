const fetch = require('node-fetch');

const fetchTTSResponse = async (server_endpoint, text) => {
    const ttsEndpoint = `${server_endpoint}/api/tts`;
    try {
        const response = await fetch(ttsEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            console.error('Failed to fetch TTS response:', response.statusText);
            return null;
        }

        const audioBuffer = await response.arrayBuffer();
        return Buffer.from(audioBuffer);
    } catch (error) {
        console.error('Error fetching TTS response:', error);
        return null;
    }
};

module.exports = {
    fetchTTSResponse,
};
