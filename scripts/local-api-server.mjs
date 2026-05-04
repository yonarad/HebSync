import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_PORT = 8787;
const API_ROOT = path.resolve(process.cwd(), 'api');

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files.
  }
}

function getRouteCandidates(pathname) {
  const normalized = pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
  const segments = normalized ? normalized.split('/') : [];

  if (segments.length === 0) {
    return [];
  }

  const directFile = path.join(API_ROOT, `${segments.join(path.sep)}.js`);
  const nestedFile = path.join(API_ROOT, ...segments, 'index.js');
  return [directFile, nestedFile];
}

async function resolveRouteModule(pathname) {
  const candidates = getRouteCandidates(pathname);

  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      const moduleUrl = `${pathToFileURL(candidate).href}?t=${Date.now()}`;
      return import(moduleUrl);
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function toWebRequest(req, bodyBuffer) {
  const origin = `http://${req.headers.host || `localhost:${API_PORT}`}`;
  const requestUrl = new URL(req.url || '/', origin);
  const init = {
    method: req.method,
    headers: req.headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = bodyBuffer;
    init.duplex = 'half';
  }

  return new Request(requestUrl, init);
}

function writeNodeResponse(res, webResponse) {
  res.statusCode = webResponse.status;

  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const cookies = webResponse.headers.getSetCookie?.() || [value];
      res.setHeader('Set-Cookie', cookies);
      return;
    }

    res.setHeader(key, value);
  });

  if (!webResponse.body) {
    res.end();
    return;
  }

  webResponse.arrayBuffer()
    .then((buffer) => {
      res.end(Buffer.from(buffer));
    })
    .catch((error) => {
      console.error('Failed to stream response body:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
      }
      res.end('Internal Server Error');
    });
}

async function handleRequest(req, res) {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `localhost:${API_PORT}`}`);

    if (!requestUrl.pathname.startsWith('/api/')) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const routeModule = await resolveRouteModule(requestUrl.pathname);
    if (!routeModule) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const methodName = (req.method || 'GET').toUpperCase();
    const handler = routeModule[methodName];

    if (typeof handler !== 'function') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    const bodyBuffer = await readRequestBody(req);
    const request = toWebRequest(req, bodyBuffer);
    const response = await handler(request);
    writeNodeResponse(res, response);
  } catch (error) {
    console.error('Local API server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

await loadEnvFile(path.resolve(process.cwd(), '.env'));
await loadEnvFile(path.resolve(process.cwd(), '.env.local'));

createServer(handleRequest).listen(API_PORT, () => {
  console.log(`Local API server listening on http://localhost:${API_PORT}`);
});
