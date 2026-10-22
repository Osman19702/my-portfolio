/**
 * Minimal static file server for the test suite.
 *
 * The site itself is build-free and dependency-free; this exists only so
 * Playwright has something to point at that behaves the same on a laptop and
 * in CI. Deliberately written with zero dependencies for that reason.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// STATIC_ROOT lets a caller serve a different tree (e.g. a checkout of an
// older commit) for before/after comparisons. Defaults to the repo root.
const ROOT = process.env.STATIC_ROOT
    ? path.resolve(process.env.STATIC_ROOT)
    : path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
    let urlPath;
    try {
        urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch {
        // A malformed escape such as /%E0%A4%A throws URIError, and an
        // uncaught throw here would take the whole server down mid-suite.
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad request');
        return;
    }
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = path.resolve(ROOT, relative);

    // Never serve anything outside the repo root.
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        res.end(data);
    });
});

// tests/serve.js waits for this exact line, so a script never mistakes some
// other process already on the port for this server.
server.listen(PORT, '127.0.0.1', () => {
    console.log('static server listening on http://127.0.0.1:' + PORT);
});

server.on('error', (error) => {
    console.error(`static server could not listen on port ${PORT}: ${error.message}`);
    process.exit(1);
});
