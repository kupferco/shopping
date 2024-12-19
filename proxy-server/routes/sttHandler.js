const { SpeechClient } = require('@google-cloud/speech');
const speechClient = new SpeechClient();

async function startSTTStreaming(req, res) {
    const audioStream = req.body.audioStream;

    try {
        const request = {
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
            },
            interimResults: true,
        };

        const recognizeStream = speechClient.streamingRecognize(request)
            .on('data', (data) => {
                console.log('Transcription:', data.results[0]?.alternatives[0]?.transcript || 'No speech detected');
                res.write(data.results[0]?.alternatives[0]?.transcript || '');
            })
            .on('error', (err) => {
                console.error('Error during STT streaming:', err);
                res.status(500).end('Error during STT streaming');
            })
            .on('end', () => {
                console.log('STT stream ended.');
                res.end();
            });

        audioStream.pipe(recognizeStream);
    } catch (err) {
        console.error('Error starting STT streaming:', err);
        res.status(500).send('Error starting STT streaming');
    }
}

module.exports = { startSTTStreaming };
