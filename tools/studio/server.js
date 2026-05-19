const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT_DIR = path.resolve(__dirname, '../..'); 

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.glb': 'model/gltf-binary',
    '.png': 'image/png',
    '.webm': 'video/webm'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT_DIR, req.url === '/' ? '/tools/studio/index.html' : req.url);
    if (req.url === '/api/models') {
        const assetsDir = path.join(ROOT_DIR, 'assets');
        fs.readdir(assetsDir, (err, files) => {
            if (err) {
                res.writeHead(500);
                return res.end(JSON.stringify({ error: err.message }));
            }
            const models = files.filter(f => f.endsWith('.glb')).map(f => ({
                name: f,
                sizeBytes: fs.statSync(path.join(assetsDir, f)).size
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ models }));
        });
        return;
    }

    if (req.url === '/api/save' && req.method === 'POST') {
        const filename = req.headers['x-filename'];
        const targetPath = path.join(ROOT_DIR, 'assets', filename);
        const fileStream = fs.createWriteStream(targetPath);
        req.pipe(fileStream);
        req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, path: targetPath }));
        });
        return;
    }

    const ext = path.extname(filePath);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            return res.end('Not Found');
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`Asset Studio V3 running at: http://localhost:${PORT}/tools/studio/index.html`);
    console.log(`======================================================\n`);
});
