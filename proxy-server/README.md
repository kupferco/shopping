# Proxy Server for Speech-to-Text and Text-to-Speech

This project enables speech-to-text (STT) and text-to-speech (TTS) processing using WebSocket connections and Google APIs. Below are the setup, deployment, and debugging instructions.

## Prerequisites

- Node.js (v16+)
- Docker
- Google Cloud SDK (`gcloud` CLI)
- FFmpeg installed locally

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run Locally
#### Using `nodemon` (auto-restarts on changes):
```bash
nodemon server.js
```

#### Regular Start:
```bash
npm start
```

The server runs by default on `localhost:8080`.

---

## Docker Deployment

### Build the Docker Image
```bash
docker build -t gcr.io/bot-exploration/proxy-server:latest .
```

### Push the Docker Image to Google Container Registry (GCR)
```bash
docker push gcr.io/bot-exploration/proxy-server:latest
```

### Deploy to Google Cloud Run
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

### View Logs on Google Cloud Run

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **Cloud Run**.
3. Select your deployed service (e.g., `proxy-server`).
4. Go to the **Logs** tab to view real-time logs.

#### Tips for Debugging:
- Filter logs using severity or message content.
- Check for errors related to WebSocket messages, STT/TTS processing, or API invocations.

### Debug Locally
Run the server locally with `npm start` and check `console.log` outputs:

```bash
npm start
```

Add `console.log` statements in key parts of the code to trace:
- WebSocket message flow.
- STT and TTS API responses.
- Error-handling blocks.

---

## Notes
- Ensure your `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set correctly when running locally or deploying.
- Update `.env` or Cloud Run environment variables for production.

---

Feel free to extend or update these instructions as needed for the team!
