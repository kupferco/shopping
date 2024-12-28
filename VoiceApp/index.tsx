import React from 'react';
import { registerRootComponent } from 'expo';
import { WebSocketProvider } from './src/WebSocketManager';
import App from './App';

// Wrap App with WebSocketProvider
const RootApp = () => (
  <WebSocketProvider>
    <App />
  </WebSocketProvider>
);

// Register RootApp instead of App
registerRootComponent(RootApp);
