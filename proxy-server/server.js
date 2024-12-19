require('dotenv').config();
const express = require('express');
const http = require('http');
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

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
}

const wss = new WebSocket.Server({ server });
const speechClient = new SpeechClient();

let recognizeStream = null;
let ffmpegProcess = null;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Function to start Google Speech-to-Text streaming
const startGoogleStreaming = (socket) => {
    console.log('Starting Google Speech streaming...');

    if (recognizeStream) {
        console.log('Recognize stream already active. Stopping existing stream.');
        stopGoogleStreaming();
    }

    recognizeStream = speechClient.streamingRecognize({
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            interimResults: true,
            singleUtterance: false,
        },
    })
        .on('data', (data) => {
            console.log('Transcription:', data.results[0]?.alternatives[0]?.transcript || 'No speech detected');
            socket.send(
                JSON.stringify({
                    transcript: data.results[0]?.alternatives[0]?.transcript || '',
                    isFinal: data.results[0]?.isFinal || false,
                })
            );
        })
        .on('error', (err) => {
            console.error('Google Streaming API error:', err);
        })
        .on('end', () => {
            console.log('Google Speech stream ended.');
        });
};

// Function to stop Google Speech streaming
const stopGoogleStreaming = () => {
    if (recognizeStream) {
        console.log('Stopping Google Speech stream...');
        recognizeStream.end();
        recognizeStream = null;
    } else {
        console.log('No active Google Speech stream to stop.');
    }
};

// Function to start FFmpeg decoding
const startFFmpeg = () => {
    console.log('Initializing FFmpeg process...');

    ffmpegProcess = spawn('ffmpeg', [
        '-i', 'pipe:0',         // Input from stdin
        '-f', 's16le',          // Output raw PCM
        '-acodec', 'pcm_s16le', // PCM codec
        '-ac', '1',             // Mono audio
        '-ar', '48000',         // 48kHz sample rate
        'pipe:1',               // Output to stdout
    ]);

    ffmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        stopGoogleStreaming();
    });

    ffmpegProcess.stdout.on('data', (pcmData) => {
        if (recognizeStream) {
            console.log('Writing PCM data to Google Speech stream:', pcmData.length);
            recognizeStream.write(pcmData);
        } else {
            console.log('Google Speech stream not active. Dropping PCM data.');
        }
    });

    ffmpegProcess.stderr.on('data', (data) => {
        // Handle FFmpeg stderr logs if necessary
    });

    console.log('FFmpeg process started.');
};

// Function to stop FFmpeg
const stopFFmpeg = () => {
    if (ffmpegProcess) {
        console.log('Stopping FFmpeg process...');
        ffmpegProcess.stdin.end();
        ffmpegProcess.kill('SIGKILL');
        ffmpegProcess = null;
    } else {
        console.log('No active FFmpeg process to stop.');
    }
};

// Handle WebSocket connections
wss.on('connection', (socket) => {
    console.log('Client connected.');

    socket.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.action === 'start') {
                console.log('Start action received.');
                startGoogleStreaming(socket);
                if (!ffmpegProcess) startFFmpeg();
            } else if (parsedMessage.action === 'stop') {
                console.log('Stop action received.');
                stopGoogleStreaming();
                // stopFFmpeg();
            }
        } catch (error) {
            if (ffmpegProcess) {
                ffmpegProcess.stdin.write(message);
            } else {
                console.error('Received raw audio data, but FFmpeg is not running.');
            }
        }
    });

    socket.on('close', () => {
        console.log('Client disconnected. Cleaning up resources.');
        stopGoogleStreaming();
        stopFFmpeg();
    });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on port ${PORT}`);
});
