# VoiceApp

VoiceApp is a simple React Native application designed to provide a barebones UI for testing voice interaction services. This app serves as a frontend to test WebSocket connections, speech-to-text (STT), text-to-speech (TTS), and API integrations in a mobile browser-friendly environment.

## Features
- Minimalistic UI for quick testing.
- WebSocket support for real-time interactions.
- Integration-ready for services like Google STT, TTS, and Gemini API.
- Mobile-browser compatibility.

## Prerequisites
- Node.js and npm installed.
- Firebase CLI installed.
- Expo CLI installed.

## Getting Started
### Clone the Repository
```bash
git clone <repository-url>
cd voiceapp
```

### Install Dependencies
```bash
npm install
```

## Scripts
The following scripts are defined in the `package.json`:

### Development Scripts
- **`start`**: Starts the Expo development server locally.
  ```bash
  npm run start
  ```
- **`android`**: Runs the app on an Android emulator or connected device.
  ```bash
  npm run android
  ```
- **`ios`**: Runs the app on an iOS simulator or connected device.
  ```bash
  npm run ios
  ```
- **`web`**: Starts the app in a web browser.
  ```bash
  npm run web
  ```

### Deployment Scripts
- **`web-build`**: Exports the app for web deployment.
  ```bash
  npm run web-build
  ```
- **`firebase-deploy`**: Builds the app for web and deploys it to Firebase hosting.
  ```bash
  npm run firebase-deploy
  ```

## Deployment
### Deploying to Firebase Hosting
1. Build the app for web:
   ```bash
   npm run web-build
   ```
2. Deploy to Firebase:
   ```bash
   npm run firebase-deploy
   ```

## Project Structure
```
voiceapp/
├── node_modules/         # Dependencies
├── src/                  # Source code
│   ├── GoogleSpeechStreamer.tsx
│   ├── PromptService.ts
│   ├── SessionManager.js
│   ├── TTSService.tsx
│   ├── WebSocketManager.tsx
├── .env.development      # Development environment variables
├── .env.production       # Production environment variables
├── package.json          # Project metadata and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # Documentation (this file)
```

## Proxy Server
VoiceApp communicates with a proxy server for handling STT and TTS logic. The proxy server manages connections to Google APIs and ensures a fluid conversation experience.

Repository for the proxy server: [voice-app-exploration proxy-server](https://github.com/kupferco/voice-app-exploration/tree/main/proxy-server)

## Dependencies
- `expo`: Framework for building React Native apps.
- `react`: Core library for React.
- `react-native`: Framework for building native apps with React.
- `uuid`: Library for generating unique IDs.

## Dev Dependencies
- `@babel/core`: Babel compiler core.
- `@types/react`: TypeScript type definitions for React.
- `@types/react-native`: TypeScript type definitions for React Native.
- `typescript`: TypeScript language support.

## Contribution
Contributions are welcome! Please submit a pull request with detailed information about your changes.

---

Happy Testing!
