const http = require('http');
const fs = require('fs');

// Start the server
const server = require('./server.js');

// Give it a moment to start
setTimeout(() => {
  const PORT = process.env.PORT || 3000;
  
  http.get(`http://localhost:${PORT}/api/leaderboard`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('GET /api/leaderboard response:');
      console.log(JSON.parse(data));
      
      // Now test POST
      const postData = JSON.stringify({ name: 'TestBot', score: 5000 });
      const req = http.request(`http://localhost:${PORT}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('\nPOST /api/scores response:');
          console.log(JSON.parse(data));
          process.exit(0);
        });
      });
      req.write(postData);
      req.end();
    });
  }).on('error', (e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}, 1000);
