const sendAudioMessage = (audioBuffer) => {
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

    console.log('Sending buffer!!');
    return combinedBuffer;
};

module.exports = {
    sendAudioMessage,
};
