require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 8082; // Proxy server port
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const speechClient = new SpeechClient();

app.use(express.static(path.join(__dirname, 'public')));

// Function to start Google Speech-to-Text streaming
const startStreaming = (socket) => {
    console.log('Starting Google Speech streaming...');

    const recognizeStream = speechClient
        .streamingRecognize({
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
                interimResults: true,
            },
        })
        .on('data', (data) => {
            console.log(
                'Transcription:',
                data.results[0]?.alternatives[0]?.transcript || 'No speech detected'
            );

            socket.send(
                JSON.stringify({
                    transcript: data.results[0]?.alternatives[0]?.transcript || '',
                    isFinal: data.results[0]?.isFinal || false,
                })
            );
        })
        .on('error', (err) => {
            console.error('Google Streaming API error:', err);
            socket.send(JSON.stringify({ error: 'Error processing audio' }));
        })
        .on('end', () => {
            console.log('Google Streaming API ended');
        });

    return recognizeStream;
};

// Function to start FFmpeg decoding
const startFFmpeg = (recognizeStream) => {
    console.log('Starting FFmpeg decoding...');

    // Spawn an FFmpeg process to decode Opus to PCM
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',         // Input from stdin
        '-f', 's16le',          // Output raw PCM
        '-acodec', 'pcm_s16le', // PCM codec
        '-ac', '1',             // Mono audio
        '-ar', '48000',         // 48kHz sample rate
        'pipe:1',               // Output to stdout
    ]);

    // ffmpeg.stderr.on('data', (data) => console.error(`FFmpeg error: ${data}`));

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        recognizeStream.end(); // End Google streaming when FFmpeg stops
    });

    // Pipe FFmpeg output to the Google Speech API
    ffmpeg.stdout.on('data', (pcmData) => {
        // console.log('Decoded PCM data length:', pcmData.length);
        recognizeStream.write(pcmData);
    });

    return ffmpeg;
};

// Handle WebSocket connections
wss.on('connection', (socket) => {
    console.log('Client connected');
    let ffmpegProcess = null;
    let recognizeStream = null;

    socket.on('message', (chunk) => {
        if (!recognizeStream) {
            recognizeStream = startStreaming(socket); // Start Google Speech streaming
            ffmpegProcess = startFFmpeg(recognizeStream); // Start FFmpeg decoding
        }

        try {
            // Write Opus audio chunk to FFmpeg
            ffmpegProcess.stdin.write(chunk);
        } catch (error) {
            console.error('Error piping to FFmpeg:', error);
        }
    });

    socket.on('close', () => {
        console.log('Client disconnected');
        if (ffmpegProcess) {
            ffmpegProcess.stdin.end();
        }
        if (recognizeStream) {
            recognizeStream.end();
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
});
