import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === '/__qa' || path === '/__qa.js') {
      const script = path === '/__qa.js';
      const data = await readFile(resolve('scripts', script ? 'browser-harness.mjs' : 'browser-harness.html'));
      response.writeHead(200, { 'Content-Type': script ? 'text/javascript' : 'text/html', 'Cache-Control': 'no-store' }); response.end(data); return;
    }
    const file = resolve(root, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(4196, '127.0.0.1', () => console.log('Pass_gen preview: http://127.0.0.1:4196'));
