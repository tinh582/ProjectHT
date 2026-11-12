import http from 'node:http';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 5000);

function forwardToBackendOnce(req, bodyBuffer, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const outHeaders = { ...req.headers };
    delete outHeaders.connection;
    delete outHeaders['keep-alive'];
    outHeaders.host = `${BACKEND_HOST}:${BACKEND_PORT}`;
    outHeaders.connection = 'close';
    if (bodyBuffer.length > 0) {
      outHeaders['content-length'] = String(bodyBuffer.length);
    }

    const proxyReq = http.request(
      {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: req.url,
        method: req.method,
        headers: outHeaders,
        agent: false,
        family: 4
      },
      (proxyRes) => {
        const resChunks = [];
        proxyRes.on('data', (chunk) => resChunks.push(chunk));
        proxyRes.on('end', () => {
          resolve({
            statusCode: proxyRes.statusCode || 200,
            headers: proxyRes.headers,
            body: Buffer.concat(resChunks)
          });
        });
        proxyRes.on('error', reject);
      }
    );

    proxyReq.setTimeout(timeoutMs, () => {
      proxyReq.destroy(Object.assign(new Error('Backend proxy request timeout'), { code: 'ETIMEDOUT' }));
    });

    proxyReq.on('error', reject);

    if (bodyBuffer.length > 0) {
      proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
  });
}

function resilientApiProxyPlugin() {
  return {
    name: 'ht-resilient-api-proxy',
    configureServer(server) {
      if (server.httpServer) {
        server.httpServer.keepAliveTimeout = 65000;
        server.httpServer.headersTimeout = 66000;
        server.httpServer.on('connection', (socket) => {
          socket.setNoDelay(true);
          socket.on('error', () => {});
        });
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        req.on('error', () => {});
        res.on('error', () => {});

        const reqChunks = [];
        try {
          await new Promise((resolve, reject) => {
            req.on('data', (chunk) => reqChunks.push(Buffer.from(chunk)));
            req.on('end', resolve);
            req.on('error', reject);
          });
        } catch {
          if (!res.headersSent && !res.writableEnded) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Yêu cầu bị ngắt kết nối giữa chừng. Vui lòng thử lại.' }));
          }
          return;
        }

        const bodyBuffer = Buffer.concat(reqChunks);
        const maxRetries = 4;
        let lastErr = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            const result = await forwardToBackendOnce(req, bodyBuffer);

            if (res.headersSent || res.writableEnded) return;

            const responseHeaders = { ...result.headers };
            delete responseHeaders.connection;
            delete responseHeaders['keep-alive'];
            delete responseHeaders['transfer-encoding'];
            responseHeaders['content-length'] = String(result.body.length);

            res.writeHead(result.statusCode, responseHeaders);
            res.end(result.body);
            return;
          } catch (err) {
            lastErr = err;
            if (attempt < maxRetries) {
              const delay = 100 * Math.pow(2, attempt);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
          }
        }

        if (!res.headersSent && !res.writableEnded) {
          res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              error: 'Kết nối tới máy chủ tạm thời gián đoạn. Vui lòng thử lại sau giây lát.',
              code: lastErr?.code || 'PROXY_UNAVAILABLE'
            })
          );
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [resilientApiProxyPlugin(), react()],
  server: {
    proxy: {
      '/api': {
        target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !res.headersSent && !res.writableEnded && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(
                JSON.stringify({
                  error: 'Kết nối tới máy chủ tạm thời gián đoạn. Vui lòng thử lại.'
                })
              );
            }
          });
        }
      }
    }
  }
});

