require('dotenv').config();
const express = require('express');
const http = require('http'); // Use HTTP for development; HTTPS is not required for Cloud Run
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

const app = express();

// Check if running in production (Cloud Run) or development (localhost)
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 8080; // Use Cloud Run's dynamic port or 8443 for localhost

let server;
if (isProduction) {
    // In production, use plain HTTP (Cloud Run handles HTTPS)
    server = http.createServer(app);
} else {
    // For local development, use HTTPS with self-signed certificates
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
    };
    server = require('https').createServer(options, app);
}

const wss = new WebSocket.Server({ server });
// Initialize Google Speech client
let speechClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.NODE_ENV === 'production') {
    // Use local credentials for development
    speechClient = new SpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
} else {
    // Use default credentials in production (Cloud Run)
    speechClient = new SpeechClient();
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello, World!');
  });

  
app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  

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
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on port ${PORT}`);
});

