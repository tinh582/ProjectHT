import { createApp } from './app.js';
import { createClients } from './config/supabase.js';
import { isTransientSupabaseError } from './src/http.js';

// Prevent stray background socket resets (ECONNRESET / EPIPE / UND_ERR_SOCKET)
// from crashing the Node.js process and dropping in-flight HTTP requests.
process.on('uncaughtException', (err) => {
  if (isTransientSupabaseError(err)) {
    console.warn('[SOCKET-GUARD] Ignored transient uncaught socket error:', err?.code || err?.message);
    return;
  }
  console.error('[FATAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  if (isTransientSupabaseError(reason)) {
    console.warn('[SOCKET-GUARD] Ignored transient unhandled rejection:', reason?.code || reason?.message);
    return;
  }
  console.error('[WARN] Unhandled rejection:', reason);
});

const port = process.env.PORT || 5000;
const server = createApp(createClients()).listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

// Keep idle connections open longer than browser/Vite proxy timeouts (65s vs default 5s)
// to eliminate keep-alive race ECONNRESET errors when clicking after a pause.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on('connection', (socket) => {
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 30000);
  socket.on('error', () => {
    // Ignore client-side socket resets (ECONNRESET / EPIPE)
  });
});

server.on('clientError', (err, socket) => {
  if (socket.writable && !socket.destroyed) {
    socket.end('HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n\r\n{"error":"Bad Request"}');
  }
});

