require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { startAudioProcessing,
    processAudioData,
    eventEmitter } = require('./services/audioProcessingService');
const { handleTTSRequest } = require('./routes/ttsHandler');
const { startSTTStreaming } = require('./routes/sttHandler');
const { handleGeminiRequest,
    handleGeminiHistoryRequest,
    updateSystemPrompt,
    handleGetSystemPrompt } = require('./routes/geminiHandler');

const { sendAudioMessage } = require('./utils/audioUtils');
const { fetchTTSResponse } = require('./services/ttsService');
const { fetchGeminiResponse } = require('./services/geminiService');

const app = express();
// Check if running in production (Cloud Run) or development (localhost)
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
    serverEndpoint = process.env.PROXY_SERVER_DEVELOPMENT
    clientURL = process.env.CLIENT_DEVELOPMENT_LOCAL;
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

// Allow all origins for development; restrict in production
// app.use(cors({
//     origin: clientURL,
//     methods: ['GET', 'POST', 'OPTIONS'], // Adjust allowed methods
//     allowedHeaders: ['Content-Type', 'Authorization'], // Adjust headers as needed
// }));
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
        // Convert buffer to string
        const messageString = message.toString();

        // Check if the message is JSON
        if (isJSON(messageString)) {
            try {
                const parsedMessage = JSON.parse(messageString);
                console.log('Parsed WebSocket message:', parsedMessage);

                // Handle JSON messages
                if (parsedMessage.action === 'start_session') {
                    const { sessionId } = parsedMessage;
                    if (!sessionId) {
                        console.error('Session ID is missing. Cannot start session.');
                        return;
                    }
                    console.log(`Session started with ID: ${sessionId}`);
                    activeSockets[sessionId] = socket; // Map sessionId to the WebSocket connection

                    socket.on('close', () => {
                        console.log(`Session closed for ID: ${sessionId}`);
                        delete activeSockets[sessionId]; // Clean up on socket close
                    });
                } else if (parsedMessage.action === 'start_stt') {
                    const { sessionId } = parsedMessage;
                    if (!sessionId || !activeSockets[sessionId]) {
                        console.error('Session ID is missing or invalid. Cannot start STT.');
                        return;
                    }
                    console.log(`Start STT action received for session ID: ${sessionId}`);
                    startAudioProcessing(sessionId);
                }
            } catch (error) {
                console.error('Error processing WebSocket JSON message:', error.message);
            }
        } else {
            // console.log('Received binary data.');
            processAudioData(message); // Handle binary data
        }
    });
});




// Listen for transcription events
eventEmitter.on('transcription', async ({ sessionId, transcript, isFinal }) => {
    const socket = activeSockets[sessionId];
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
            const geminiData = await fetchGeminiResponse(sessionId, serverEndpoint, transcript);

            if (!geminiData) {
                console.error('Failed to fetch Gemini response (server).');
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

