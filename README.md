# Simple WebRTC Screen Share

A lightweight, dependency-free screen sharing web application. It uses pure WebRTC for a direct Peer-to-Peer (P2P) video connection and utilizes a Google Apps Script (Google Sheets) as a simple signaling server to exchange connection offers and answers.

## Features
* **True P2P Video:** High-speed video transmission directly between devices.
* **Vanilla Codebase:** No React, no Webpack, no external libraries. Just clean HTML, CSS, and JS.
* **Modern Arcade UI:** Custom dark-mode interface with neon accents and mobile Quality of Life controls (Fullscreen & Picture-in-Picture).
* **Free Signaling:** Uses a simple Google Sheet to handle the initial WebRTC handshake.

## How to Run Locally

1. **Clone the repository:**
   Download or clone this project to your local machine.

2. **Create the Config File:**
   Because the signaling server URL is private, it is excluded from this repository via `.gitignore`. You must create a file named `config.js` in the root directory.

3. **Add your Google Apps Script URL:**
   Inside `config.js`, paste the following code, replacing the placeholder with your actual deployed Google Apps Script Web App URL:
   `const API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";`

4. **Launch the App:**
   Start a local server (like the VS Code Live Server extension) to run the `index.html` file. 
   *(Note: Screen capture requires the site to be served over `https://` or `localhost` to bypass browser security blocks).*