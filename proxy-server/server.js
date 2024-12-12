require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');

// Initialize Express
const app = express();
const PORT = 8081;

// Start a WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

// Google Cloud Speech Client
const speechClient = new SpeechClient();

// Handle WebSocket Connections
wss.on('connection', (ws) => {
    console.log('Client connected');

    // Handle incoming audio data
    ws.on('message', async (message) => {
        try {
            const request = {
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US',
                },
                audio: {
                    content: message.toString('base64'),
                },
            };

            const [response] = await speechClient.recognize(request);
            const transcript = response.results
                .map((result) => result.alternatives[0].transcript)
                .join('\n');
            
            // Send the transcript back to the frontend
            ws.send(JSON.stringify({ transcript }));
        } catch (error) {
            console.error('Error processing audio:', error);
            ws.send(JSON.stringify({ error: 'Error processing audio' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Attach WebSocket server to Express server
const server = app.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
});
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (socket) => {
        wss.emit('connection', socket, request);
    });
});
