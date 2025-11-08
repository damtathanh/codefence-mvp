// Dev server script that starts Vite and opens browser once when ready
const { spawn, exec } = require('child_process');
const http = require('http');

const vite = spawn('vite', ['--host'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  shell: true
});

let browserOpened = false;
const URL = 'http://localhost:5173';

// Function to open browser (cross-platform)
function openBrowser() {
  if (browserOpened) return;
  browserOpened = true;

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

// Track if we've detected server ready signal
let serverReadyDetected = false;

// Listen to Vite stdout
vite.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Check if Vite server is ready (look for "Local:" in output)
  if (!serverReadyDetected && !browserOpened && (output.includes('Local:') || output.includes('localhost:5173'))) {
    // Mark as detected to prevent multiple triggers
    serverReadyDetected = true;
    
    // Wait a bit to ensure server is fully ready, then open browser
    setTimeout(() => {
      if (browserOpened) return; // Already opened, skip
      
      // Verify server is actually responding before opening browser
      const req = http.get(URL, (res) => {
        if (!browserOpened) {
          openBrowser();
        }
      });

      req.on('error', () => {
        // Server might not be ready yet, retry once after a short delay
        setTimeout(() => {
          if (browserOpened) return; // Already opened, skip
          
          const retryReq = http.get(URL, (retryRes) => {
            if (!browserOpened) {
              openBrowser();
            }
          });
          
          retryReq.on('error', () => {
            // If still not ready, open anyway (server is likely starting)
            if (!browserOpened) {
              openBrowser();
            }
          });
          
          retryReq.setTimeout(1000, () => {
            retryReq.destroy();
            if (!browserOpened) {
              openBrowser();
            }
          });
        }, 500);
      });

      req.setTimeout(2000, () => {
        req.destroy();
        // If timeout, open browser anyway
        if (!browserOpened) {
          openBrowser();
        }
      });
    }, 500);
  }
});

vite.stderr.on('data', (data) => {
  process.stderr.write(data);
});

vite.on('close', (code) => {
  if (code !== null && code !== 0) {
    console.error(`\x1b[31m❌ Vite server exited with code ${code}\x1b[0m`);
  }
  process.exit(code || 0);
});

vite.on('error', (error) => {
  console.error(`\x1b[31m❌ Failed to start Vite: ${error.message}\x1b[0m`);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  vite.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  vite.kill('SIGTERM');
  process.exit(0);
});

