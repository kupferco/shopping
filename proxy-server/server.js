require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const {
    startAudioProcessing,
    processAudioData,
    stopAudioProcessing,
    eventEmitter,
} = require('./services/audioProcessingService');
const { handleTTSRequest } = require('./routes/ttsHandler');
const { startSTTStreaming } = require('./routes/sttHandler');
const {
    handleGeminiRequest,
    handleGeminiHistoryRequest,
    updateSystemPrompt,
    handleGetSystemPrompt,
} = require('./routes/geminiHandler');

const { sendAudioMessage } = require('./utils/audioUtils');
const { fetchTTSResponse } = require('./services/ttsService');
const { fetchGeminiResponse } = require('./services/geminiService');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 8080;

let serverEndpoint;
let server;
let clientURL;
if (isProduction) {
    server = http.createServer(app);
    serverEndpoint = process.env.PROXY_SERVER_PRODUCTION;
    clientURL = process.env.CLIENT_PRODUCTION;
} else if (process.env.HTTPS_ROUTE === 'NGROK') {
    server = http.createServer(app);
    serverEndpoint = process.env.PROXY_SERVER_NGROK;
    clientURL = process.env.CLIENT_DEVELOPMENT_NGROK;
} else {
    serverEndpoint = process.env.PROXY_SERVER_DEVELOPMENT;
    clientURL = process.env.CLIENT_DEVELOPMENT_LOCAL;
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
    };
    server = require('https').createServer(options, app);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const wss = new WebSocket.Server({ server });
const activeSockets = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.send('Hello, World!'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.use(cors());

// API Endpoints
app.post('/api/tts', handleTTSRequest);
app.post('/api/stt', startSTTStreaming);
app.post('/api/gemini', handleGeminiRequest);
app.post('/api/gemini/system-prompt', updateSystemPrompt);
app.get('/api/gemini/system-prompt', handleGetSystemPrompt);
app.get('/api/gemini/history', handleGeminiHistoryRequest);

const isJSON = (message) => {
    try {
        JSON.parse(message);
        return true;
    } catch {
        return false;
    }
};

wss.on('connection', (socket) => {
    console.log('Client connected.');

    socket.on('message', (message) => {
        const messageString = message.toString();
        if (isJSON(messageString)) {
            try {
                const parsedMessage = JSON.parse(messageString);
                const { action, sessionId, audioData } = parsedMessage;

                if (!sessionId) {
                    console.error('Session ID is missing.');
                    return;
                }

                switch (action) {
                    case 'start_session':
                        console.log(`Session started with ID: ${sessionId}`);
                        activeSockets[sessionId] = socket;

                        socket.on('close', () => {
                            console.log(`Session closed for ID: ${sessionId}`);
                            delete activeSockets[sessionId];
                            stopAudioProcessing(sessionId);
                        });
                        break;

                    case 'restart_session':
                        console.log(`Session restarted with ID: ${sessionId}`);
                        if (activeSockets[sessionId]) {
                            stopAudioProcessing(sessionId); // Stop existing session
                        }
                        activeSockets[sessionId] = socket; // Assign the new session ID
                        break;

                    case 'start_stt':
                        if (!activeSockets[sessionId]) {
                            console.error('Invalid session ID. Cannot start STT.');
                            return;
                        }
                        console.log(`Start STT action received for session ID: ${sessionId}`);

                        activeSockets[sessionId].mode = parsedMessage.mode || 'default';

                        startAudioProcessing(sessionId);
                        break;

                    case 'stop_stt':
                        if (!activeSockets[sessionId]) {
                            console.error('Invalid session ID. Cannot stop STT.');
                            return;
                        }
                        console.log(`Stop STT action received for session ID: ${sessionId}`);
                        stopAudioProcessing(sessionId);
                        break;

                    case 'stt_audio':
                        if (!activeSockets[sessionId]) {
                            console.error('Invalid session ID. Cannot process audio.');
                            return;
                        }
                        if (!audioData) {
                            console.error('Audio data is missing.');
                            return;
                        }
                        const binaryAudio = Buffer.from(audioData, 'base64');
                        processAudioData(sessionId, binaryAudio);
                        break;

                    default:
                        console.error(`Unknown action: ${action}`);
                }
            } catch (error) {
                console.error('Error processing WebSocket JSON message:', error.message);
            }
        } else {
            console.error('Received non-JSON message. Ignoring.');
        }
    });
});


// Listen for transcription events
eventEmitter.on('transcription', async ({ sessionId, transcript, isFinal }) => {
    const socket = activeSockets[sessionId];
    if (!socket) return;

    socket.send(
        JSON.stringify({
            action: 'stt',
            payload: {
                transcript,
                isFinal,
            },
        })
    );

    // Check mode
    const mode = socket.mode || 'default';
    if (mode === 'stt_only') return; // Skip Gemini and TTS if in stt_only modeƒ

    if (isFinal || true) {
        console.log('Final transcript:', transcript);

        try {
            const geminiData = await fetchGeminiResponse(sessionId, serverEndpoint, transcript);

            if (!geminiData) {
                console.error('Failed to fetch Gemini response.');
                return;
            }

            socket.send(
                JSON.stringify({
                    action: 'gemini',
                    payload: {
                        agent: geminiData.response,
                    },
                })
            );

            const audioBufferResponse = await fetchTTSResponse(serverEndpoint, geminiData.response);

            if (audioBufferResponse) {
                console.log('Sending TTS audio to client...');

                // Convert the audio buffer to Base64
                const audioBase64 = audioBufferResponse.toString('base64');

                // Encapsulate the Base64 audio buffer in JSON
                const payload = {
                    action: 'tts_audio',
                    payload: {
                        audioData: audioBase64,
                    },
                };

                console.log(payload.action)
                // Send JSON-encapsulated TTS audio to the client
                socket.send(JSON.stringify(payload));
            } else {
                console.error('Failed to generate TTS audio.');
            }


            // if (audioBufferResponse) {
            //     console.log('Sending audio to client...');
            //     const combinedBuffer = sendAudioMessage(audioBufferResponse);
            //     socket.send(combinedBuffer);
            // } else {
            //     console.error('Failed to generate audio.');
            // }
        } catch (error) {
            console.error('Error in transcription event:', error);
        }
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on port ${PORT}`);
});
