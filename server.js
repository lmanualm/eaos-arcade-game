const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// In-memory score storage (top-10)
let scores = [];

// Helper: keep only top 10 scores
function keepTop10(scoresArray) {
  return scoresArray
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// Helper: serve static files
function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    let contentType = 'text/plain';
    if (filePath.endsWith('.html')) {
      contentType = 'text/html; charset=utf-8';
    } else if (filePath.endsWith('.js')) {
      contentType = 'application/javascript; charset=utf-8';
    } else if (filePath.endsWith('.css')) {
      contentType = 'text/css; charset=utf-8';
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /api/scores - return top-10 scores
  if (req.method === 'GET' && pathname === '/api/scores') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scores: scores }));
    return;
  }

  // POST /api/scores - add new score
  if (req.method === 'POST' && pathname === '/api/scores') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.name && typeof data.score === 'number') {
          scores.push({
            name: data.name,
            score: data.score,
            timestamp: new Date().toISOString()
          });
          scores = keepTop10(scores);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, scores: scores }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid data' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Serve static files
  if (pathname === '/' || pathname === '') {
    serveStaticFile(path.join(__dirname, 'index.html'), res);
  } else if (pathname === '/game.js') {
    serveStaticFile(path.join(__dirname, 'game.js'), res);
  } else if (pathname === '/style.css') {
    serveStaticFile(path.join(__dirname, 'style.css'), res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
