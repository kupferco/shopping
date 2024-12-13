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
                interimResults: true, // Include interim results
                singleUtterance: false, // Set to true if you want Google to close the session after a pause
            },
            audioContent: {}, // Explicitly clear audio content
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
        // console.log('Writing PCM data to Google Speech stream:', pcmData.length);
        recognizeStream.write(pcmData);
    });

    ffmpeg.stderr.on('data', (data) => {
        // console.error(`555 FFmpeg stderr: ${data.toString()}`);
    });

    console.log('FFmpeg process started');
    return ffmpeg;
};


// Handle WebSocket connections
wss.on('connection', (socket) => {
    console.log('\n\n=====\nClient connected');
    let ffmpegProcess = null;
    let recognizeStream = null;

    const stopStreaming = () => {
        console.log('Stopping streaming pipeline...');
        console.log('  recognizeStream exists:', !!recognizeStream);
        console.log('  ffmpegProcess exists:', !!ffmpegProcess);

        if (ffmpegProcess) {
            console.log('Stopping FFmpeg process...');
            try {
                ffmpegProcess.stdin.end();
                ffmpegProcess.kill('SIGKILL'); // Forcefully terminate FFmpeg
            } catch (error) {
                console.error('Error terminating FFmpeg process:', error);
            }
            ffmpegProcess = null;
        }

        if (recognizeStream) {
            console.log('Ending Google Speech stream...');
            try {
                recognizeStream.end(); // End Google streaming
            } catch (error) {
                console.error('Error ending Google Speech stream:', error);
            }
            recognizeStream = null;
        }

        console.log('After stopping:');
        console.log('  recognizeStream =', !!recognizeStream);
        console.log('  ffmpegProcess =', !!ffmpegProcess);
        console.log('Stopped streaming to Google Speech API.');
    };




    const startStreamingToGoogle = () => {
        console.log('Attempting to start streaming...');
        console.log('Current state before starting:');
        console.log('  recognizeStream =', !!recognizeStream);
        console.log('  ffmpegProcess =', !!ffmpegProcess);
        if (recognizeStream || ffmpegProcess) {
            console.log('Streaming pipeline is already running. Restarting...');
        }
        console.log('Stopping streaming inside start function...');
        stopStreaming(); // Ensure all processes are terminated

        console.log('Starting Google Speech streaming...');
        recognizeStream = startStreaming(socket); // Create a new Google Speech stream
        console.log('Google Speech stream initialized.');
        ffmpegProcess = startFFmpeg(recognizeStream); // Create a new FFmpeg process
        console.log('FFmpeg process initialized.');

        // Clear FFmpeg buffer to avoid stale data
        // ffmpegProcess.stdin.write(Buffer.alloc(0)); // Send an empty buffer to flush

        console.log('Streaming pipeline started successfully.');
    };






    socket.on('message', (message) => {
        // console.log(message);
        try {
            // Attempt to parse the message as JSON
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.action === 'stop') {
                console.log('\n\nStop action received');
                stopStreaming();
            } else if (parsedMessage.action === 'start') {
                console.log('\n\nStart action received');
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
