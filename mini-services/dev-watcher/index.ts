/**
 * 🔸 Dev Watcher - مراقب خادم Next.js
 * يضمن استمرار عمل خادم التطوير وإعادة تشغيله تلقائياً إذا توقف
 * يعمل كـ mini-service داخل الحاوية
 */

import { spawn, ChildProcess } from 'child_process';
import { createReadStream } from 'fs';

const PROJECT_DIR = '/home/z/my-project';
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5 seconds between retries
const CHECK_INTERVAL = 10000; // Check every 10 seconds

let serverProcess: ChildProcess | null = null;
let retryCount = 0;
let isShuttingDown = false;

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:3000/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isShuttingDown) {
      resolve();
      return;
    }

    log('🚀 Starting Next.js dev server...');

    serverProcess = spawn('npx', ['next', 'dev', '-p', '3000'], {
      cwd: PROJECT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env },
    });

    let resolved = false;

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        process.stdout.write(output);
        
        if (!resolved && output.includes('Ready in')) {
          log('✅ Next.js dev server is ready!');
          retryCount = 0;
          resolved = true;
          resolve();
        }
      });
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data: Buffer) => {
        process.stderr.write(data);
      });
    }

    serverProcess.on('exit', (code, signal) => {
      log(`⚠️ Server process exited with code: ${code}, signal: ${signal}`);
      serverProcess = null;
      
      if (!resolved) {
        resolved = true;
        reject(new Error(`Server exited before becoming ready (code: ${code})`));
      }
    });

    serverProcess.on('error', (err) => {
      log(`❌ Failed to start server: ${err.message}`);
      serverProcess = null;
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    // Timeout - if server doesn't become ready in 30 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        log('⏰ Server startup timed out, assuming ready...');
        resolve();
      }
    }, 30000);
  });
}

async function stopServer(): Promise<void> {
  if (serverProcess && serverProcess.pid) {
    log('🛑 Stopping server...');
    try {
      serverProcess.kill('SIGTERM');
      // Give it 5 seconds to shut down gracefully
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try { serverProcess?.kill('SIGKILL'); } catch {}
          resolve();
        }, 5000);
        
        serverProcess?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (e) {
      log(`Error stopping server: ${e}`);
    }
    serverProcess = null;
  }
}

async function ensureServerRunning(): Promise<void> {
  const isHealthy = await checkServerHealth();
  
  if (isHealthy && serverProcess) {
    // Server is healthy and we have a reference - all good
    return;
  }
  
  if (!isHealthy) {
    log('⚠️ Server not responding, restarting...');
    await stopServer();
    
    retryCount++;
    if (retryCount > MAX_RETRIES) {
      log(`❌ Max retries (${MAX_RETRIES}) exceeded. Waiting longer before retry...`);
      await new Promise(resolve => setTimeout(resolve, 60000));
      retryCount = 0;
    }
    
    try {
      await startServer();
    } catch (error) {
      log(`❌ Failed to start server: ${error}`);
    }
  }
}

// Graceful shutdown
async function shutdown() {
  isShuttingDown = true;
  log('🔽 Shutting down dev-watcher...');
  await stopServer();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Main loop
async function main() {
  log('🔸 Dev Watcher started');
  
  // Initial start
  try {
    await startServer();
    log('✅ Initial server startup successful');
  } catch (error) {
    log(`❌ Initial server startup failed: ${error}`);
    log('Will retry in watch loop...');
  }
  
  // Watch loop
  while (!isShuttingDown) {
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    await ensureServerRunning();
  }
}

main().catch((error) => {
  log(`Fatal error: ${error}`);
  process.exit(1);
});
