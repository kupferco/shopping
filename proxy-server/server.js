require('dotenv').config();
const fs = require('fs');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { startAudioProcessing,
    processAudioData,
    stopGoogleStreaming,
    stopAudioProcessing,
    eventEmitter } = require('./services/audioProcessingService');
const { handleTTSRequest } = require('./routes/ttsHandler');
const { startSTTStreaming } = require('./routes/sttHandler');
const { handleGeminiRequest, handleGeminiHistoryRequest } = require('./routes/geminiHandler');

const { sendAudioMessage } = require('./utils/audioUtils');
const { fetchTTSResponse } = require('./services/ttsService');
const { fetchGeminiResponse } = require('./services/geminiService');


const app = express();
// Check if running in production (Cloud Run) or development (localhost)
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 8080;

let serverEndpoint;
let server;
if (isProduction) {
    server = http.createServer(app);
    serverEndpoint = process.env.PROXY_SERVER_PRODUCTION;
} else if (process.env.HTTPS_ROUTE === 'NGROK') {
    server = http.createServer(app);
    serverEndpoint = process.env.PROXY_SERVER_NGROK;
} else {
    serverEndpoint = process.env.PROXY_SERVER_DEVELOPMENT
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
    };
    server = require('https').createServer(options, app);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const activeSockets = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.send('Hello, World!'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// API Endpoints
app.post('/api/tts', handleTTSRequest);
app.post('/api/stt', startSTTStreaming);
app.post('/api/gemini', handleGeminiRequest);
app.get('/api/gemini/history', handleGeminiHistoryRequest);

// WebSocket Connections
wss.on('connection', (socket) => {
    console.log('Client connected.');
    const socketId = Date.now(); // Unique identifier for the socket
    activeSockets[socketId] = socket;

    console.log('Client connected:', socketId);

    socket.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.action === 'start_stt') {
                console.log('Start action received.');
                startAudioProcessing(socketId);
            } else if (parsedMessage.action === 'stop_stt') {
                console.log('Stop action received.');
                stopGoogleStreaming();
            }
        } catch (error) {
            // If the message isn't JSON, treat it as raw audio data
            // console.log(message)
            processAudioData(message);
        }
    });

    socket.on('close', () => {
        console.log('Client disconnected. Cleaning up resources.');
        stopAudioProcessing();
    });
});

// Listen for transcription events
eventEmitter.on('transcription', async ({ socketId, transcript, isFinal }) => {
    const socket = activeSockets[socketId];
    if (!socket) return;

    // Send transcription to the client
    socket.send(JSON.stringify({
        action: 'stt',
        payload: {
            transcript,
            isFinal,
        },
    }));

    if (isFinal) {
        console.log('Final transcript:', transcript);

        try {
            // Call the Gemini service for a response
            const geminiData = await fetchGeminiResponse(serverEndpoint, transcript);

            if (!geminiData) {
                console.error('Failed to fetch Gemini response.');
                return;
            }

            // Send the Gemini response back to the client
            socket.send(JSON.stringify({
                action: 'gemini',
                payload: {
                    agent: geminiData.response,
                },
            }));

            // Process the Gemini response with TTS
            const audioBufferResponse = await fetchTTSResponse(serverEndpoint, geminiData.response);

            if (audioBufferResponse) {
                console.log('Sending audio to client...');
                const combinedBuffer = sendAudioMessage(audioBufferResponse);
                socket.send(combinedBuffer);
            } else {
                console.error('Failed to generate audio.');
            }
        } catch (error) {
            console.error('Error in transcription event:', error);
        }
    }
});


// Helper function to call TTS API
// async function fetchTTSResponse(text) {
//     try {
//         const response = await fetch(`${serverEndpoint}/api/tts`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ text }),
//         });

//         if (!response.ok) {
//             console.error('Failed to fetch TTS response:', response.statusText);
//             return null;
//         }

//         // Read the response as an ArrayBuffer
//         const audioBuffer = await response.arrayBuffer();

//         // Write the buffer to a file for testing
//         // const outputPath = path.join(__dirname, 'output.mp3');
//         // fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
//         // console.log(`Audio saved to ${outputPath}`);

//         // Return the buffer (can be sent to client via WebSocket)
//         return Buffer.from(audioBuffer);
//     } catch (error) {
//         console.error('Error fetching TTS response:', error);
//         return null;
//     }
// }

// Test the function
// fetchTTSResponse("Hello, Gemini!").then((audioBuffer) => {
//     if (audioBuffer) {
//         console.log('TTS audio fetched successfully!');
//     } else {
//         console.error('Failed to fetch TTS audio.');
//     }
// });




// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on port ${serverEndpoint}`);
});

