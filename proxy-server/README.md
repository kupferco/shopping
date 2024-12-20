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

## Testing Locally with `ngrok`

To test locally on a mobile device or external network using `ngrok`, follow these steps:

### Prerequisites

1. Install `ngrok`: 
   ```bash
   npm install -g ngrok
   ```

2. Set up an `ngrok.yml` configuration file:

   Create the file `~/.ngrok/ngrok.yml` (if it doesn’t already exist):
   ```yaml
   version: "2"
   authtoken: YOUR_NGROK_AUTH_TOKEN
   tunnels:
     client:
       proto: http
       addr: 8081
     proxy:
       proto: https
       addr: 8080
   ```

   Replace `YOUR_NGROK_AUTH_TOKEN` with your actual token from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).

### Run `ngrok` Tunnels

Start both tunnels defined in your `ngrok.yml` file:
```bash
ngrok start --all
```

This will create two public URLs for testing:
- **Client:** Accessible at the public URL for `client` (e.g., `http://abc123.ngrok.io`).
- **Proxy:** Accessible at the public URL for `proxy` (e.g., `https://xyz456.ngrok.io`).

### Update Client and Proxy Configurations

1. Replace `localhost` references in the client configuration with the `ngrok` public URL for the client.
   ```javascript
   const socket = new WebSocket('wss://xyz456.ngrok.io');
   ```

2. Use the public `ngrok` URLs to test the client and proxy from your mobile browser.

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

---

Feel free to extend or update these instructions as needed for the team!
