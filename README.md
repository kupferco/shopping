# Voice App Exploration

This app is dedicated to studying the interaction between the client and server when creating a conversational app integrating Speech-to-Text (STT), Gemini, and Text-to-Speech (TTS). The focus is purely on technical integration; thus, the UI is bare, and the front-end structure is minimal.

## Project Structure

The project is composed of the following components:

1. **Proxy Server**
   - Handles the backend logic and communication with STT, Gemini, and TTS APIs.
   - Located in the `proxy-server` folder.
   - Deployment is managed via Google Cloud Run.

2. **React Native Web Front-End**
   - Built with React Native Expo and exported for web.
   - Located in the `VoiceApp` folder.
   - Deployment is managed via Firebase Hosting.

3. **Websocket communication**
   - All communication between client and server is made via websocket.


## Purpose

This repository focuses on the technical integration aspects of conversational app development. A separate repository exists to focus on UI design and development:

- [Voice UI Exploration Repository](https://github.com/kupferco/voice-ui-exploration)

The `Voice UI Exploration` repository serves as a boilerplate for building a more comprehensive application with a growing feature set and a user-centric design.

## NPM Scripts for Client

The following scripts have been added to `package.json` for client-side deployment and building:

```json
"scripts": {
    "web-build": "npx expo export --platform web",
    "firebase-deploy": "firebase deploy"
}
```

---

Feel free to explore, extend, and integrate further components as needed for your conversational app projects.
