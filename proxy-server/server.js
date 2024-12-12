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
    console.log('Initializing FFmpeg process...');

    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',         // Input from stdin
        '-f', 's16le',          // Output raw PCM
        '-acodec', 'pcm_s16le', // PCM codec
        '-ac', '1',             // Mono audio
        '-ar', '48000',         // 48kHz sample rate
        'pipe:1',               // Output to stdout
    ]);

    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process exited with code ${code}`);
        recognizeStream.end(); // End Google streaming when FFmpeg stops
    });

    ffmpeg.stdout.on('data', (pcmData) => {
        recognizeStream.write(pcmData);
    });

    console.log('FFmpeg process started');
    return ffmpeg;
};


// Handle WebSocket connections
wss.on('connection', (socket) => {
    console.log('Client connected');
    let ffmpegProcess = null;
    let recognizeStream = null;

    const stopStreaming = () => {
        if (ffmpegProcess) {
            ffmpegProcess.stdin.end();
            ffmpegProcess.kill(); // Ensure FFmpeg process is terminated
            ffmpegProcess = null;
        }
        if (recognizeStream) {
            recognizeStream.end();
            recognizeStream = null;
        }
        console.log('Stopped streaming to Google Speech API');
    };
    
    const startStreamingToGoogle = () => {
        if (!recognizeStream) {
            console.log('Starting Google Speech streaming...');
            recognizeStream = startStreaming(socket); // Start Google Speech streaming
            ffmpegProcess = startFFmpeg(recognizeStream); // Start FFmpeg decoding
            console.log('Resumed streaming to Google Speech API');
        } else {
            console.log('Streaming is already running');
        }
    };
    
    

    socket.on('message', (message) => {
        // console.log(message);
        try {
            // Attempt to parse the message as JSON
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.action === 'stop') {
                console.log('Stop action received');
                stopStreaming();
            } else if (parsedMessage.action === 'start') {
                console.log('Start action received');
                startStreamingToGoogle();
            }
        } catch (error) {
            // If JSON parsing fails, treat it as raw audio data
            if (ffmpegProcess) {
                try {
                    ffmpegProcess.stdin.write(message);
                } catch (ffmpegError) {
                    console.error('Error piping to FFmpeg:', ffmpegError);
                }
            } else {
                console.error('Received raw audio data, but FFmpeg is not running');
            }
        }
    });



    socket.on('close', () => {
        console.log('Client disconnected');
        stopStreaming();
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
});
