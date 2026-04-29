const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const BASE_DIR = path.resolve(process.env.EDITOR_ROOT || os.homedir());
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function safePath(requestedPath) {
  const resolved = path.resolve(BASE_DIR, requestedPath.replace(/^\/+/, ''));
  if (!resolved.startsWith(BASE_DIR)) {
    throw new Error('Adgang nægtet: sti udenfor hjemmemappen');
  }
  return resolved;
}

app.get('/api/dir', (req, res) => {
  try {
    const dir = req.query.path ? safePath(req.query.path) : BASE_DIR;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    res.json(
      entries
        .filter(e => !e.name.startsWith('.') || req.query.hidden)
        .map(e => ({
          name: e.name,
          isDir: e.isDirectory(),
          path: path.relative(BASE_DIR, path.join(dir, e.name)),
        }))
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/file', (req, res) => {
  try {
    const filePath = safePath(req.query.path);
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/file', (req, res) => {
  try {
    const filePath = safePath(req.body.path);
    fs.writeFileSync(filePath, req.body.content, 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function listen(port) {
  const server = app.listen(port, '127.0.0.1');
  server.on('listening', () => {
    const { port: p } = server.address();
    console.log(`Editor kører på  http://localhost:${p}`);
    console.log(`Rodmappe:        ${BASE_DIR}`);
  });
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') listen(port + 1);
    else throw err;
  });
}

listen(PORT);
