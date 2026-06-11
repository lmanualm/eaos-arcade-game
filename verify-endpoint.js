const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3100,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`GET ${path}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}\n`);
        resolve();
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  try {
    await new Promise(r => setTimeout(r, 1000)); // Wait for server
    await testEndpoint('/api/leaderboard');
    await testEndpoint('/api/scores');
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

runTests();
