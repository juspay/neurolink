import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';

// Use built output of the SDK to avoid ts-node. Ensure build before running.
// Disable MCP in demo to avoid starting external MCP servers
process.env.NEUROLINK_DISABLE_MCP = process.env.NEUROLINK_DISABLE_MCP || 'true';
import { NeuroLink } from '../../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5175;

async function start() {
  const app = express();
  const server = http.createServer(app);

  // Static files
  const publicDir = path.resolve(__dirname, 'public');
  app.use(express.static(publicDir));

  // Health
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Helper to handle a connected WS client
  function handleConnection(ws) {
    (async () => {
      const neurolink = new NeuroLink();

      // Simple async queue to turn ws messages into an AsyncIterable<Buffer>
      const frameQueue = [];
      let frameResolve = null;
      let closed = false;

      const dequeue = () => {
        if (frameResolve && frameQueue.length > 0) {
          const resolve = frameResolve;
          frameResolve = null;
          resolve({ value: frameQueue.shift(), done: false });
        }
      };

      ws.on('message', async (data, isBinary) => {
        try {
          if (!isBinary && typeof data === 'string') {
            try {
              const msg = JSON.parse(data);
              if (msg && msg.type === 'flush') {
                // Push a zero-length buffer that the provider treats as a flush signal
                frameQueue.push(Buffer.alloc(0));
                dequeue();
              }
              return;
            } catch {
              // ignore non-JSON text
            }
          }
          // Treat binary as PCM16LE frame
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
          frameQueue.push(buf);
          dequeue();
        } catch (e) {
          // ignore
        }
      });

      ws.on('close', () => {
        closed = true;
        if (frameResolve) {
          const resolve = frameResolve;
          frameResolve = null;
          resolve({ value: undefined, done: true });
        }
      });

      const framesFromClient = {
        [Symbol.asyncIterator]() {
          return {
            next() {
              if (closed) return Promise.resolve({ value: undefined, done: true });
              if (frameQueue.length > 0) {
                return Promise.resolve({ value: frameQueue.shift(), done: false });
              }
              return new Promise((resolve) => {
                frameResolve = resolve;
              });
            },
          };
        },
      };

      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-native-audio-dialog';
      let streamResult;
      try {
        streamResult = await neurolink.stream({
          provider: 'google-ai',
          model: modelName,
          input: {
            audio: {
              frames: framesFromClient,
              // sampleRateHz and encoding default to 16000 / 'PCM16LE'
            },
          },
          // Explicitly disable tools for Phase 1
          disableTools: true,
        });
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: (e && e.message) || String(e) }));
        ws.close();
        return;
      }

      try {
        for await (const ev of streamResult.stream) {
          // Only forward audio chunks in Phase 1
          const anyEv = ev;
          if (anyEv && typeof anyEv === 'object' && 'type' in anyEv && anyEv.type === 'audio') {
            // Send raw PCM16LE bytes back to the client
            ws.send(anyEv.audio.data, { binary: true });
          }
          if (ws.readyState !== ws.OPEN) break;
        }
      } catch (e) {
        // Stream ended or error
      } finally {
        if (ws.readyState === ws.OPEN) ws.close();
      }
    })().catch(() => {
      try { ws.close(); } catch {}
    });
  }

  // Graceful shutdown
  function setupShutdown(closeables) {
    const shutdown = (code = 0) => {
      for (const c of closeables) {
        try { c(); } catch {}
      }
      try { process.exit(code); } catch {}
    };
    process.on('SIGINT', () => shutdown(0));
    process.on('SIGTERM', () => shutdown(0));
    process.on('SIGHUP', () => shutdown(0));
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      shutdown(1);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
      shutdown(1);
    });
    process.on('beforeExit', () => {
      for (const c of closeables) {
        try { c(); } catch {}
      }
    });
    process.on('exit', () => {
      for (const c of closeables) {
        try { c(); } catch {}
      }
    });
  }

  // Try to listen, falling back if the port is in use
  async function listenWithFallback(prefPort) {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const tryPort = i === 0 ? prefPort : prefPort + i;
      try {
        await new Promise((resolve, reject) => {
          server.once('error', (err) => {
            if (err && err.code === 'EADDRINUSE') return reject(err);
            // Unexpected error
            reject(err);
          });
          server.listen(tryPort, resolve);
        });
        return tryPort;
      } catch (e) {
        // Continue trying next port
        continue;
      }
    }
    // Last resort: use ephemeral port 0
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, resolve);
    });
    const addr = server.address();
    return typeof addr === 'object' && addr ? addr.port : prefPort;
  }

  const boundPort = await listenWithFallback(PORT);

  // Now that the server is listening, attach WebSocketServer
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', handleConnection);
  wss.on('error', (e) => {
    console.error('WebSocket error:', e?.message || e);
  });

  // Setup graceful shutdown
  setupShutdown([
    () => {
      try { for (const client of wss.clients) client.close(); } catch {}
      try { wss.close(); } catch {}
    },
    () => { try { server.close(); } catch {} },
  ]);

  const url = `http://localhost:${boundPort}`;
  console.log(`\n🗣️  Voice demo running at ${url}`);
  console.log(`   WS endpoint: ws://localhost:${boundPort}/ws`);
  console.log(`\nNote: set GOOGLE_AI_API_KEY (or GEMINI_API_KEY) before running.`);
  openBrowser(url);
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'darwin') cmd = 'open';
  else if (platform === 'win32') cmd = 'start';
  else cmd = 'xdg-open';
  try {
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref();
  } catch {
    console.log(`Please open your browser to ${url}`);
  }
}

start().catch((e) => {
  console.error('Failed to start demo server:', e);
  process.exit(1);
});
