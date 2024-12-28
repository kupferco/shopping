# Voice App Exploration

This app is dedicated to studying the interaction between the client and server when creating a conversational app integrating Speech-to-Text (STT), Gemini, and Text-to-Speech (TTS). The primary focus is to make the **proxy server robust and scalable**, ensuring it can support various UI studies and adapt to growing demands. While the UI is minimal, the backend is designed to evolve with future user interface requirements.

## Project Structure

The repository is organized as follows:

```
voice-app-exploration/
├── VoiceApp/          # Front-end (React Native Web + Expo)
├── proxy-server/      # Back-end (Node.js Proxy Server)
├── update-ngrok-env.js # Script to update .env files dynamically with ngrok URLs
├── package.json       # Project scripts and dependencies
```

The project is composed of the following components:

1. **Proxy Server**
   - Handles the backend logic and communication with STT, Gemini, and TTS APIs.
   - Located in the [proxy-server](https://github.com/kupferco/voice-app-exploration/tree/main/proxy-server) folder.
   - Deployment is managed via Google Cloud Run.

2. **React Native Web Front-End**
   - Built with React Native Expo and exported for web.
   - Located in the [VoiceApp](https://github.com/kupferco/voice-app-exploration/tree/main/VoiceApp) folder.
   - Deployment is managed via Firebase Hosting.

3. **Websocket Communication**
   - Most voice interactions between client and server are made via WebSocket. Some functionalities are managed via REST instead (for example "clear history", "save instruction prompt", etc...)

## Purpose

This repository focuses on the backend's robustness and scalability to support conversational app development. The **proxy server** is the central component, designed to grow with the needs of various user interface experiments. A separate repository exists to focus on UI design and development:

- [Voice UI Exploration Repository](https://github.com/kupferco/voice-ui-exploration)

The `Voice UI Exploration` repository serves as a boilerplate for building a more comprehensive application with a growing feature set and a user-centric design.

## Getting Started

### Prerequisites
- **Node.js** (v18+ recommended)
- **Expo CLI** (`npm install -g expo-cli`)
- **Ngrok** (installed and configured with a `~/.ngrok/ngrok.yml` configuration file)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd voice-app-exploration
   ```

2. Install dependencies:
   ```bash
   npm install
   cd proxy-server && npm install
   cd ../VoiceApp && npm install
   cd ..
   ```

## Scripts

### Primary Scripts
- **`npm run start-project-ngrok`**
  Starts the ngrok tunnels, updates the `.env` files, clears the Expo cache, and runs the front-end and back-end servers.

  **Usage:**
  ```bash
  npm run start-project-ngrok
  ```

- **`npm start`**
  Runs the app without starting ngrok. Use this if ngrok is already running.

  **Usage:**
  ```bash
  npm start
  ```

### Supporting Scripts
- **`npm run start-ngrok`**
  Starts ngrok tunnels based on the configuration in `~/.ngrok/ngrok.yml`.

  **Usage:**
  ```bash
  npm run start-ngrok
  ```

- **`npm run update-ngrok`**
  Updates `.env` files in `VoiceApp` and `proxy-server` with the latest ngrok URLs.

  **Usage:**
  ```bash
  npm run update-ngrok
  ```

- **`npm run start-proxy`**
  Starts the proxy server.

  **Usage:**
  ```bash
  npm run start-proxy
  ```

- **`npm run start-client`**
  Starts the client with Expo, clearing the cache to ensure `.env` changes are applied.

  **Usage:**
  ```bash
  npm run start-client
  ```

- **`npm run web-build`**
  Exports the front-end as a web app.

  **Usage:**
  ```bash
  npm run web-build
  ```

- **`npm run firebase-deploy`**
  Deploys the front-end to Firebase Hosting.

  **Usage:**
  ```bash
  npm run firebase-deploy
  ```

## Ngrok Configuration
Ensure you have a valid `~/.ngrok/ngrok.yml` configuration file to start ngrok tunnels. Example configuration:

```yaml
authtoken: <your-ngrok-auth-token>
tunnels:
  client:
    addr: 8081
    proto: http
  proxy:
    addr: 8080
    proto: http
```

## Development Workflow

### Starting the Project
1. Run the primary script:
   ```bash
   npm run start-project-ngrok
   ```

   This will:
   - Start ngrok tunnels.
   - Update `.env` files dynamically with ngrok URLs.
   - Clear the Expo cache.
   - Start both the proxy server and client.

2. Access the front-end app in your browser (Expo will provide a QR code and URL).

### Verifying Environment Variables
Ensure that the `.env` files in both `VoiceApp` and `proxy-server` are correctly updated. Example for `VoiceApp/.env`:

```
API_URL=https://<ngrok-tunnel-url>
```

### Stopping the Project
Use `Ctrl+C` to terminate all running processes.

## Debugging

### Common Issues
1. **Ngrok Tunnels Not Found**:
   Ensure ngrok is installed and your `ngrok.yml` file is correctly configured.

2. **Environment Variable Changes Not Reflecting**:
   Clear the Expo cache:
   ```bash
   npx expo start --clear
   ```

3. **WebSocket Connection Issues**:
   Verify that the correct `API_URL` is passed to the WebSocket manager.


