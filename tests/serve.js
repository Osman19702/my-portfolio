/**
 * Starts tests/static-server.js for a script that needs a site to point a
 * browser at (tests/lighthouse.js).
 *
 *   const site = serve(root, port);
 *   await site.ready;   // site.url is now answering
 *   ...
 *   site.child.kill();
 *
 * `ready` resolves on the server's own "listening" line rather than on the
 * port answering. Polling the port cannot tell this server from a stale one
 * left on it by an earlier run, and a measurement of the wrong tree looks
 * exactly like a real one. If the port is taken, the
 * server exits and `ready` rejects instead.
 */
const { spawn } = require('child_process');
const path = require('path');

function serve(root, port) {
    const child = spawn(process.execPath, [path.join(__dirname, 'static-server.js')], {
        env: { ...process.env, PORT: String(port), ...(root ? { STATIC_ROOT: root } : {}) },
        stdio: ['ignore', 'pipe', 'inherit'],
    });
    const url = `http://127.0.0.1:${port}/`;
    const ready = new Promise((resolve, reject) => {
        child.stdout.on('data', (chunk) => {
            if (String(chunk).includes('listening')) resolve();
        });
        child.once('exit', (code) => {
            reject(new Error(`static server for ${url} exited with code ${code} before it was listening`));
        });
    });
    // A server killed during cleanup before anyone awaited it must not
    // surface as an unhandled rejection; awaiting `ready` still throws.
    ready.catch(() => {});
    return { child, url, ready };
}

module.exports = { serve };
