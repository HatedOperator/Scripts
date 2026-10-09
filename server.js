// Indicator Studios site server: serves the static site on the host's port.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 20011;
const ROOT = __dirname;

const TYPES = {
  html: 'text/html', css: 'text/css', js: 'text/javascript',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', ico: 'image/x-icon', json: 'application/json'
};

http.createServer(function (req, res) {
  let url = (req.url || '/').split('?')[0];
  if (url === '/') url = '/index.html';
  const filePath = path.join(ROOT, path.normalize(url));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(filePath, function (err, data) {
    if (err) { res.writeHead(404); return res.end('not found'); }
    const ext = url.split('.').pop().toLowerCase();
    // HTML must always revalidate so deploys show instantly; assets cache briefly
    const cache = ext === 'html' ? 'no-cache' : 'public, max-age=300';
    res.writeHead(200, {
      'Content-Type': (TYPES[ext] || 'application/octet-stream') + '; charset=utf-8',
      'Cache-Control': cache
    });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('Indicator Studios site live on port ' + PORT);
});
