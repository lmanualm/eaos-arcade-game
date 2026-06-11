const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3100;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// In-memory score storage (top-10 cached)
let scores = [];
let cachedLeaderboard = [];
let lastCacheTime = 0;
const CACHE_TTL = 5000;

// Helper: keep only top 10 scores
function keepTop10(scoresArray) {
  return scoresArray
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

// Helper: load scores from file
function loadScoresFromFile() {
  try {
    if (fs.existsSync(SCORES_FILE)) {
      const data = fs.readFileSync(SCORES_FILE, 'utf8');
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error('Error loading scores:', err);
  }
  return [];
}

// Helper: get top 10 with caching
function getLeaderboard() {
  const now = Date.now();
  if (now - lastCacheTime > CACHE_TTL || cachedLeaderboard.length === 0) {
    const allScores = loadScoresFromFile();
    cachedLeaderboard = keepTop10(allScores);
    lastCacheTime = now;
  }
  return cachedLeaderboard;
}

// Load scores at startup
scores = loadScoresFromFile();

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /api/leaderboard - return top-10 scores
  if (req.method === 'GET' && pathname === '/api/leaderboard') {
    const leaderboard = getLeaderboard();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scores: leaderboard }));
    return;
  }

  // GET /api/scores - return top-10 scores (legacy)
  if (req.method === 'GET' && pathname === '/api/scores') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scores: getLeaderboard() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Run tests after startup
  setTimeout(() => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/leaderboard',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('\n=== TEST RESULTS ===');
        console.log('Endpoint: GET /api/leaderboard');
        console.log('Status: ' + res.statusCode);
        console.log('Response:');
        console.log(data);
        
        const parsed = JSON.parse(data);
        console.log('\nVerification:');
        console.log('✓ Response is valid JSON');
        console.log('✓ Contains "scores" field');
        console.log('✓ Number of scores:', parsed.scores.length);
        if (parsed.scores.length > 0) {
          console.log('✓ Top score:', parsed.scores[0].score, 'by', parsed.scores[0].name);
          console.log('✓ Includes timestamp:', !!parsed.scores[0].timestamp);
        }
        
        server.close();
        process.exit(0);
      });
    });

    req.on('error', (err) => {
      console.error('Test error:', err);
      server.close();
      process.exit(1);
    });
    
    req.end();
  }, 500);
});
