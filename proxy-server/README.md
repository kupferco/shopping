# Proxy Server for Voice App Exploration

This document outlines the services and endpoints provided by the proxy server for handling Speech-to-Text (STT), Gemini, and Text-to-Speech (TTS) processing. The server is designed to be robust and scalable for conversational app development.

---

## Features

- **WebSocket Communication** for real-time audio processing.
- **RESTful API** endpoints for managing system prompts and conversation history.
- Integration with **Google STT and TTS APIs**.
- Gemini API integration for generating conversational responses.

---

## Endpoints

### General Endpoints
- **`GET /`**: Returns a greeting message ("Hello, World!").
- **`GET /health`**: Returns `OK` if the server is running.

### API Endpoints
- **`POST /api/tts`**: Handles text-to-speech requests.
- **`POST /api/stt`**: Handles speech-to-text requests via HTTP (currently unused in favor of WebSocket).
- **`POST /api/gemini`**: Sends user input to the Gemini API and retrieves a response. Optionally clears conversation history when `clear: true` is passed.
- **`GET /api/gemini/history`**: Retrieves the conversation history for a given session.
- **`POST /api/gemini/system-prompt`**: Updates the system prompt for a session.
- **`GET /api/gemini/system-prompt`**: Retrieves the current system prompt for a session.

---

## Conversation History Management

The server maintains a conversation history for each session, which includes exchanges between the user and the assistant. This history can be managed using the following strategies:

### Clearing History
- Use the `clear: true` flag in the **`POST /api/gemini`** endpoint to reset the conversation history for the session, retaining only the initial system prompt.
- Alternatively, use **`GET /api/gemini/history?clear=true`** to achieve the same result.

### Updating History
- The history is automatically updated with each user message and assistant response.

### Retrieving History
- Use **`GET /api/gemini/history`** to fetch the current conversation history for a session.

---

## Deployment and Local Testing

### Prerequisites

- **Node.js** (v18+ recommended)
- **FFmpeg** (for audio processing)
- **Google Cloud SDK** (for deployment)
- **Ngrok** (for local testing)

### Local Setup

1. **Install Dependencies**:
    ```bash
    npm install
    cd proxy-server && npm install
    ```

2. **Run Locally**:
    ```bash
    nodemon server.js
    ```

3. **Using Ngrok**:
    - Configure `~/.ngrok/ngrok.yml`:
      ```yaml
      authtoken: YOUR_NGROK_AUTH_TOKEN
      tunnels:
        proxy:
          proto: https
          addr: 8080
      ```
    - Start ngrok:
      ```bash
      ngrok start --all --config ~/.ngrok/ngrok.yml
      ```

4. **Environment Variables**:
    Ensure `.env` is configured with:
    ```
    API_KEY=<Your Google API Key>
    NODE_ENV=development
    USE_MOCK_GEMINI=true
    ```

### Docker Deployment

1. **Build Image**:
    ```bash
    docker build -t gcr.io/bot-exploration/proxy-server:latest .
    ```

2. **Push to GCR**:
    ```bash
    docker push gcr.io/bot-exploration/proxy-server:latest
    ```

3. **Deploy to Google Cloud Run**:
    ```bash
    gcloud run deploy proxy-server \
        --image=gcr.io/bot-exploration/proxy-server:latest \
        --platform=managed \
        --region=europe-west2 \
        --allow-unauthenticated \
        --set-env-vars NODE_ENV=production
    ```

---

## Debugging

### Viewing Logs

1. **Google Cloud Run Logs**:
    - Navigate to **Cloud Run** in [Google Cloud Console](https://console.cloud.google.com/).
    - Select your service and view logs in the **Logs** tab.

2. **Local Debugging**:
    - Run with `nodemon` for auto-restart:
      ```bash
      nodemon server.js
      ```
    - Enable verbose logging in `.env`:
      ```
      DEBUG=true
      ```

### Common Issues

- **Ngrok Errors**:
  Ensure `ngrok` is configured correctly and tunnels are active.
- **Environment Variable Issues**:
  Verify `.env` files are correctly updated.
- **WebSocket Issues**:
  Check the `API_URL` in the client matches the proxy server address.

---

## Contribution Guidelines

Feel free to contribute by submitting pull requests for bug fixes or enhancements. Ensure code adheres to the existing style and includes relevant documentation updates.
