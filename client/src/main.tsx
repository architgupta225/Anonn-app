import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeAntiDebug } from "./lib/anti-debug";
import { initializeApiEncryption } from "./lib/api-encryption";
import { Buffer } from 'buffer';

// Polyfill Buffer for browser compatibility
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

// Initialize security systems
async function initializeSecurity() {
  try {
    await Promise.all([
      initializeAntiDebug(),
      initializeApiEncryption(),
    ]);
    console.log('🔒 Security systems initialized');
  } catch (error) {
    console.error('Security initialization failed:', error);
  }
}

// Start security initialization
initializeSecurity();

createRoot(document.getElementById("root")!).render(<App />);
