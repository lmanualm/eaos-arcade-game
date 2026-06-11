const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const SCORES_FILE = path.join(__dirname, 'scores.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

// In-memory score storage (top-10 cached)
let scores = [];
let cachedLeaderboard = [];
let lastCacheTime = 0;
const CACHE_TTL = 5000; // Cache for 5 seconds

// In-memory settings storage
let playerSettings = {};

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

// Helper: save scores to file
function saveScoresToFile(scoresArray) {
  try {
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scoresArray, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving scores:', err);
  }
}

// Helper: load settings from file
function loadSettingsFromFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data) || {};
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
  return {};
}

// Helper: save settings to file
function saveSettingsToFile(settingsObj) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsObj, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving settings:', err);
  }
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

// Load settings at startup
playerSettings = loadSettingsFromFile();

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

  // GET /api/leaderboard - return top-10 scores (optimized for performance)
  if (req.method === 'GET' && pathname === '/api/leaderboard') {
    const startTime = Date.now();
    const leaderboard = getLeaderboard();
    const queryTime = Date.now() - startTime;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      scores: leaderboard,
      queryTimeMs: queryTime
    }));
    return;
  }

  // GET /api/scores - return top-10 scores (legacy endpoint)
  if (req.method === 'GET' && pathname === '/api/scores') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ scores: getLeaderboard() }));
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
        
        // Validate input
        if (!data.name || typeof data.score !== 'number') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid data: name and score are required' }));
          return;
        }
        
        if (data.score < 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid data: score cannot be negative' }));
          return;
        }
        
        // Add new score
        scores.push({
          name: String(data.name).slice(0, 50), // Limit name length
          score: Math.floor(data.score),
          timestamp: new Date().toISOString()
        });
        
        // Keep only top 10 and save
        scores = keepTop10(scores);
        saveScoresToFile(scores);
        
        // Invalidate cache
        cachedLeaderboard = scores;
        lastCacheTime = Date.now();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, scores: scores }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

   // GET /api/settings/:playerId - retrieve player settings
   const settingsGetMatch = pathname.match(/^\/api\/settings\/(.*?)$/);
   if (req.method === 'GET' && pathname.startsWith('/api/settings/')) {
     const playerId = decodeURIComponent(settingsGetMatch ? settingsGetMatch[1] : '');
    
    if (!playerId || playerId.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Player ID is required' }));
      return;
    }
    
    const settings = playerSettings[playerId] || {
      playerId: playerId,
      nickname: playerId,
      soundEnabled: true,
      createdAt: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(settings));
    return;
  }

  // POST /api/settings - save player settings
  if (req.method === 'POST' && pathname === '/api/settings') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Validate required fields
        if (!data.playerId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Player ID is required' }));
          return;
        }
        
        const playerId = String(data.playerId).slice(0, 100); // Limit player ID length
        
        // Validate nickname if provided
        if (data.nickname !== undefined && data.nickname !== null) {
          const nickname = String(data.nickname).slice(0, 50);
          if (nickname.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Nickname cannot be empty' }));
            return;
          }
        }
        
        // Validate soundEnabled if provided
        if (data.soundEnabled !== undefined && typeof data.soundEnabled !== 'boolean') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Sound preference must be a boolean' }));
          return;
        }
        
        // Create or update settings
        const currentSettings = playerSettings[playerId] || { createdAt: new Date().toISOString() };
        const updatedSettings = {
          playerId: playerId,
          nickname: data.nickname !== undefined ? String(data.nickname).slice(0, 50) : (currentSettings.nickname || playerId),
          soundEnabled: data.soundEnabled !== undefined ? data.soundEnabled : (currentSettings.soundEnabled !== undefined ? currentSettings.soundEnabled : true),
          createdAt: currentSettings.createdAt,
          updatedAt: new Date().toISOString()
        };
        
        playerSettings[playerId] = updatedSettings;
        saveSettingsToFile(playerSettings);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, settings: updatedSettings }));
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
