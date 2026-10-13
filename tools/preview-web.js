/*
 * Serve dist/ on this computer only — run with:  npm run preview:web
 *
 * No extra packages. Build first (npm run build:web). Nothing is deployed.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const host = '127.0.0.1';
const port = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml'
};

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html is missing. Run: npm run build:web');
  process.exit(1);
}

function resolve(urlPath) {
  let pathname;
  try { pathname = decodeURIComponent(urlPath.split('?')[0]); }
  catch (e) { return null; }
  if (pathname.includes('\0')) return null;
  const rel = path.normalize(pathname).replace(/^([/\\])+/, '');
  const root = path.resolve(dist);
  let file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

const server = http.createServer((req, res) => {
  const file = resolve(req.url || '/');
  if (!file) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  fs.stat(file, (err, stat) => {
    let target = file;
    if (!err && stat.isDirectory()) target = path.join(file, 'index.html');
    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
        res.end('Not found');
        return;
      }
      const type = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(data);
    });
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error('Port ' + port + ' is in use. Try: PORT=8081 npm run preview:web');
  else console.error(err.message);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log('Cardiac Companion demo: http://' + host + ':' + port + '/');
  console.log('This computer only. Nothing is deployed.');
});
