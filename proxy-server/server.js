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
const { handleGeminiRequest } = require('./routes/geminiHandler');



const app = express();
// Check if running in production (Cloud Run) or development (localhost)
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 8080;

let server;
if (isProduction) {
    server = http.createServer(app);
} else {
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
        "action": "stt",
        "payload": {
            "transcript": transcript,
            "isFinal": isFinal
        }
    }));

    if (isFinal) {
        console.log('Final transcript:', transcript);

        try {
            // Send transcript to TTS API
            const geminiResponse = await fetchGeminiResponse(transcript);

            // Send audio response to the client
            if (geminiResponse) {
                console.log('Gemini response', geminiResponse);
                // socket.send(JSON.stringify({ agent: geminiResponse }));
                socket.send(JSON.stringify({
                    "action": "gemini",
                    "payload": {
                        "agent": geminiResponse
                    }
                }));
            
                // Send transcript to TTS API
                const audioBufferResponse = await fetchTTSResponse(transcript);

                // Send audio response to the client
                if (audioBufferResponse) {
                    console.log('Sending audio to client...');
                    // Example usage
                    sendAudioMessage(socket, audioBufferResponse);
                    // socket.send(audioBufferResponse, { binary: true }); // Send audio buffer to client
                } else {
                    console.error('Failed to generate audio.');
                }
            }
        } catch (error) {
            console.log('Something wrong with Gemini response ::', error);
        }

    }
});

const sendAudioMessage = (socket, audioBuffer) => {
    // Create metadata as a JSON object
    const metadata = {
        action: 'tts_audio',
    };

    // Convert metadata to a JSON string and then to a buffer
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));

    // Create a separator buffer to distinguish metadata from audio data
    const separator = Buffer.from('\n');

    // Concatenate metadata, separator, and audioBuffer
    const combinedBuffer = Buffer.concat([metadataBuffer, separator, audioBuffer]);

    // Send the combined buffer via WebSocket
    console.log('Sending buffer!!')
    socket.send(combinedBuffer);
};


// Helper function to call GEMINI API
async function fetchGeminiResponse(text) {
    try {
        const response = await fetch('https://127.0.0.1:8080/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputText: text }), // Properly format the body
        });

        if (!response.ok) {
            console.error('Failed to fetch Gemini response:', response.statusText);
            return null;
        }

        const jsonResponse = await response.json(); // Parse JSON response
        return jsonResponse;
    } catch (error) {
        console.error('Error fetching Gemini response:', error);
        return null;
    }
}


// Helper function to call TTS API
async function fetchTTSResponse(text) {
    try {
        const response = await fetch('https://127.0.0.1:8080/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            console.error('Failed to fetch TTS response:', response.statusText);
            return null;
        }

        // Read the response as an ArrayBuffer
        const audioBuffer = await response.arrayBuffer();

        // Write the buffer to a file for testing
        // const outputPath = path.join(__dirname, 'output.mp3');
        // fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        // console.log(`Audio saved to ${outputPath}`);

        // Return the buffer (can be sent to client via WebSocket)
        return Buffer.from(audioBuffer);
    } catch (error) {
        console.error('Error fetching TTS response:', error);
        return null;
    }
}

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
    console.log(`Proxy server running on port https://localhost:${PORT}`);
});

