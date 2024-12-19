const { spawn } = require('child_process');
const { SpeechClient } = require('@google-cloud/speech');
const { EventEmitter } = require('events');

const eventEmitter = new EventEmitter();
const speechClient = new SpeechClient();

let recognizeStream = null;
let ffmpegProcess = null;

const streamingState = {
    isStreaming: false,
};

const startAudioProcessing = (socketId) => {
    if (streamingState.isStreaming) {
        console.log('Streaming already active. Ignoring start request.');
        return;
    }

    console.log('Starting audio processing pipeline...');
    streamingState.isStreaming = true;

    // Initialize Google Speech streaming
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
            const transcript = data.results[0]?.alternatives[0]?.transcript || '';
            const isFinal = data.results[0]?.isFinal || false;

            console.log('Transcription:', transcript);

            // Emit the event with transcription data
            eventEmitter.emit('transcription', { socketId, transcript, isFinal });
        })
        .on('error', (err) => {
            console.error('Google Streaming API error:', err);
        })
        .on('end', () => {
            console.log('Google Speech stream ended.');
        });

    // Initialize FFmpeg process
    if (!ffmpegProcess) {
        ffmpegProcess = spawn('ffmpeg', [
            '-i', 'pipe:0',         // Input from stdin
            '-f', 's16le',          // Output raw PCM
            '-acodec', 'pcm_s16le', // PCM codec
            '-ac', '1',             // Mono audio
            '-ar', '48000',         // 48kHz sample rate
            'pipe:1',               // Output to stdout
        ]);

        ffmpegProcess.stdout.on('data', (pcmData) => {
            if (recognizeStream) {
                // console.log('Writing PCM data to Google Speech stream:', pcmData.length);
                recognizeStream.write(pcmData);
            } else {
                console.log('Google Speech stream not active. Dropping PCM data.');
            }
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            ffmpegProcess = null; // Reset FFmpeg process
        });

        ffmpegProcess.stderr.on('data', (data) => {
            // Optional: Log FFmpeg stderr output
        });

        console.log('FFmpeg process started.');
    }

    console.log('Audio processing pipeline started.');
};

const processAudioData = (data) => {
    if (ffmpegProcess) {
        ffmpegProcess.stdin.write(data);
    } else {
        console.error('Received raw audio data, but FFmpeg is not running.');
    }
};

const stopGoogleStreaming = () => {
    if (!streamingState.isStreaming) {
        console.log('No active streaming to stop.');
        return;
    }

    console.log('Stopping Google Speech stream...');
    streamingState.isStreaming = false;

    if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
    }
};

const stopAudioProcessing = () => {
    console.log('Stopping audio processing pipeline...');
    streamingState.isStreaming = false;

    // Stop Google Speech streaming
    stopGoogleStreaming();

    // Stop FFmpeg
    if (ffmpegProcess) {
        ffmpegProcess.stdin.end();
        ffmpegProcess.kill('SIGKILL');
        ffmpegProcess = null;
    }
};

module.exports = {
    startAudioProcessing,
    processAudioData,
    stopGoogleStreaming, // Expose only this for "stop" action
    stopAudioProcessing, // Expose this for connection closure
    eventEmitter,
};
