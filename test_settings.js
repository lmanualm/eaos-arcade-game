const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/settings/test-player-xyz',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.abort();
  process.exit(1);
});

req.end();
