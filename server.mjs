import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import realtime from './netlify/functions/realtime.mjs';

const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/stories.js', ['stories.js', 'text/javascript']],
  ['/style.css', ['style.css', 'text/css']],
]);

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type + '; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && files.has(url.pathname)) {
      const [file, type] = files.get(url.pathname);
      return send(res, 200, type, await readFile(new URL('./public/' + file, import.meta.url)));
    }
    const options = { method: req.method, headers: req.headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = Readable.toWeb(req);
      options.duplex = 'half';
    }
    const response = await realtime(new Request(url, options));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) send(res, 500, 'text/plain', 'The activity could not load.');
  }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => {
  console.log(`InfoGap listening on port ${server.address().port}`);
});
