// Simple script to open browser after Vite server starts
// This runs in the background while vite starts

const { exec } = require('child_process');
const http = require('http');

const MAX_RETRIES = 30;
const RETRY_DELAY = 500;
const URL = 'http://localhost:5173';

function waitForServer(retries = 0) {
  if (retries >= MAX_RETRIES) {
    console.log('\x1b[33m⚠️  Server not ready after 15 seconds. Please open http://localhost:5173 manually\x1b[0m');
    return;
  }

  const req = http.get(URL, (res) => {
    // Server is ready, open browser
    openBrowser();
  });

  req.on('error', () => {
    // Server not ready yet, retry
    setTimeout(() => waitForServer(retries + 1), RETRY_DELAY);
  });

  req.on('timeout', () => {
    req.destroy();
    setTimeout(() => waitForServer(retries + 1), RETRY_DELAY);
  });

  req.setTimeout(1000);
}

function openBrowser() {
  const platform = process.platform;
  let command;

  if (platform === 'darwin') {
    command = `open ${URL}`;
  } else if (platform === 'win32') {
    command = `start ${URL}`;
  } else {
    command = `xdg-open ${URL}`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`\x1b[33m⚠️  Could not auto-open browser. Please visit ${URL}\x1b[0m`);
    } else {
      console.log(`\x1b[32m✅ Browser opened at ${URL}\x1b[0m`);
    }
  });
}

// Start checking for server
setTimeout(() => waitForServer(), 1000);

