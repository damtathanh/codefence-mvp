// scripts/dev-server.cjs
// Launch Vite dev server and open browser only once after server ready.

const { spawn, exec } = require('child_process');

const VITE_CMD = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const VITE_ARGS = ['vite', '--host'];
const FALLBACK_URL = 'http://localhost:5173';

let browserOpened = false;

function openBrowser(url) {
  if (browserOpened) return;
  browserOpened = true;

  const platform = process.platform;
  const cmd =
    platform === 'darwin'
      ? `open "${url}"`
      : platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.log(`⚠️ Could not auto-open browser. Please open manually: ${url}`);
    } else {
      console.log(`\x1b[32m✅ Browser opened at ${url}\x1b[0m`);
    }
  });
}

const vite = spawn(VITE_CMD, VITE_ARGS, {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

if (!vite) {
  console.error('❌ Failed to start Vite process.');
  process.exit(1);
}

// Listen to stdout for URL
if (vite.stdout) {
  vite.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    // Extract URL from Vite output (e.g., "Local: http://localhost:5173/")
    const urlMatch = text.match(/Local:\s*(https?:\/\/[^\s]+)/i);
    if (urlMatch && urlMatch[1] && !browserOpened) {
      openBrowser(urlMatch[1]);
    } else if (/Local:/.test(text) && !browserOpened) {
      // Fallback: if "Local:" appears but no URL extracted, use fallback after delay
      setTimeout(() => {
        if (!browserOpened) {
          openBrowser(FALLBACK_URL);
        }
      }, 500);
    }
  });
}

// Listen to stderr if exists
if (vite.stderr) {
  vite.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });
}

// Handle process errors
vite.on('error', (error) => {
  console.error(`❌ Failed to start Vite: ${error.message}`);
  process.exit(1);
});

vite.on('close', (code) => {
  if (code !== null && code !== 0) {
    console.error(`❌ Vite server exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Cleanup when exiting
process.on('exit', () => {
  if (vite && !vite.killed) vite.kill('SIGTERM');
});

process.on('SIGINT', () => {
  if (vite && !vite.killed) vite.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (vite && !vite.killed) vite.kill('SIGTERM');
  process.exit(0);
});
