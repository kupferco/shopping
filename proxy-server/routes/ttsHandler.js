const textToSpeech = require('@google-cloud/text-to-speech');
const ttsClient = new textToSpeech.TextToSpeechClient();

async function handleTTSRequest(req, res) {
    const { text } = req.body;

    try {
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        res.set('Content-Type', 'audio/mp3');
        res.send(response.audioContent);
    } catch (err) {
        console.error('Error generating speech:', err);
        res.status(500).send('Error generating speech');
    }
}

module.exports = { handleTTSRequest };
