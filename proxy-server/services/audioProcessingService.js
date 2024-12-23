const { spawn } = require('child_process');
const { SpeechClient } = require('@google-cloud/speech');
const { EventEmitter } = require('events');

const eventEmitter = new EventEmitter();
const speechClient = new SpeechClient();

const sessions = {}; // A map to track session-specific state

const startAudioProcessing = (sessionId) => {
    if (sessions[sessionId]?.isStreaming) {
        console.log(`Streaming already active for session ${sessionId}. Ignoring start request.`);
        return;
    }

    console.log(`Starting audio processing pipeline for session ${sessionId}...`);

    // Initialize session state
    sessions[sessionId] = {
        recognizeStream: null,
        ffmpegProcess: null,
        isStreaming: true,
        silenceInterval: null,
    };

    // Initialize Google Speech streaming
    const recognizeStream = speechClient.streamingRecognize({
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
            console.log(`Session ${sessionId} Transcription:`, transcript);
            eventEmitter.emit('transcription', { sessionId, transcript });
        })
        .on('error', (err) => {
            console.error(`Session ${sessionId} Google Streaming API error:`, err);
            stopAudioProcessing(sessionId); // Stop the pipeline on error
        })
        .on('end', () => {
            console.log(`Session ${sessionId} Google Speech stream ended.`);
        });

    sessions[sessionId].recognizeStream = recognizeStream;

    // Inject silence to prevent timeouts
    const silenceBuffer = Buffer.alloc(48000 * 2, 0); // 1 second of silence at 48kHz
    sessions[sessionId].silenceInterval = setInterval(() => {
        if (recognizeStream) {
            // recognizeStream.write(silenceBuffer);
        }
    }, 1000);

    // Initialize FFmpeg process
    const ffmpegProcess = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 's16le',
        '-acodec', 'pcm_s16le',
        '-ac', '1',
        '-ar', '48000',
        'pipe:1',
    ]);

    ffmpegProcess.stdout.on('data', (pcmData) => {
        // console.log(`Session ${sessionId} PCM data length: ${pcmData.length}`);
        if (sessions[sessionId].recognizeStream) {
            sessions[sessionId].recognizeStream.write(pcmData);
        } else {
            console.log(`Session ${sessionId} recognizeStream not active.`);
        }
    });

    ffmpegProcess.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('error') || message.includes('Error')) {
            console.error(`Session ${sessionId} FFmpeg Error:`, message);
        } else {
            // console.log(`Session ${sessionId} FFmpeg Status:`, message);
        }
    });


    ffmpegProcess.on('close', (code) => {
        console.log(`Session ${sessionId} FFmpeg process exited with code ${code}`);
        if (sessions[sessionId]) {
            sessions[sessionId].ffmpegProcess = null;
        } else {
            console.log(`Session ${sessionId} already removed from sessions.`);
        }
    });    

    sessions[sessionId].ffmpegProcess = ffmpegProcess;

    console.log(`Audio processing pipeline started for session ${sessionId}.`);
};

const processAudioData = (sessionId, data) => {
    const session = sessions[sessionId];
    if (session?.ffmpegProcess) {
        session.ffmpegProcess.stdin.write(data);
    } else {
        console.error(`Session ${sessionId} received raw audio data, but FFmpeg is not running.`);
    }
};

const stopAudioProcessing = (sessionId) => {
    if (!sessions[sessionId]) {
        console.log(`Session ${sessionId} does not exist or is already stopped.`);
        return;
    }

    const session = sessions[sessionId];
    if (!session.isStreaming) {
        console.log(`No active streaming to stop for session ${sessionId}.`);
        return;
    }

    console.log(`Stopping audio processing pipeline for session ${sessionId}...`);

    session.isStreaming = false;

    // Stop recognizeStream
    if (session.recognizeStream) {
        try {
            session.recognizeStream.end();
        } catch (err) {
            console.error(`Error ending recognizeStream for session ${sessionId}:`, err.message);
        }
        session.recognizeStream = null;
    }

    // Stop FFmpeg process
    if (session.ffmpegProcess) {
        try {
            session.ffmpegProcess.stdin.end();
            session.ffmpegProcess.kill('SIGKILL');
        } catch (err) {
            console.error(`Error stopping FFmpeg process for session ${sessionId}:`, err.message);
        }
        session.ffmpegProcess = null;
    }

    // Clear silence interval
    if (session.silenceInterval) {
        clearInterval(session.silenceInterval);
        session.silenceInterval = null;
    }

    // Remove session from sessions map
    delete sessions[sessionId];

    console.log(`Audio processing pipeline stopped for session ${sessionId}.`);
};


module.exports = {
    startAudioProcessing,
    processAudioData,
    stopAudioProcessing,
    eventEmitter,
};
