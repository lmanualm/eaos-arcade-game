const http = require('http');

const BASE_URL = `http://localhost:${process.env.PORT || 3100}`;

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Starting Settings API Tests...\n');

  let passCount = 0;
  let failCount = 0;

  // Test 1: GET non-existent player returns default settings
  console.log('Test 1: GET /api/settings/:playerId (new player)');
  try {
    const result = await makeRequest('GET', '/api/settings/player-test-1');
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 200 && result.body.playerId === 'player-test-1' && result.body.soundEnabled === true) {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected 200 with default settings\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 2: POST new player settings
  console.log('Test 2: POST /api/settings (save new player settings)');
  try {
    const result = await makeRequest('POST', '/api/settings', {
      playerId: 'alice-001',
      nickname: 'Alice',
      soundEnabled: true
    });
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 200 && result.body.success && result.body.settings.playerId === 'alice-001' && result.body.settings.nickname === 'Alice') {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected successful save\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 3: GET saved player settings
  console.log('Test 3: GET /api/settings/:playerId (retrieve saved settings)');
  try {
    const result = await makeRequest('GET', '/api/settings/alice-001');
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 200 && result.body.playerId === 'alice-001' && result.body.nickname === 'Alice') {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected saved settings\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 4: POST update player settings
  console.log('Test 4: POST /api/settings (update existing player settings)');
  try {
    const result = await makeRequest('POST', '/api/settings', {
      playerId: 'alice-001',
      nickname: 'AlicePlus',
      soundEnabled: false
    });
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 200 && result.body.settings.nickname === 'AlicePlus' && result.body.settings.soundEnabled === false) {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected updated settings\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 5: POST without playerId (validation error)
  console.log('Test 5: POST /api/settings (missing playerId - validation)');
  try {
    const result = await makeRequest('POST', '/api/settings', {
      nickname: 'Bob'
    });
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 400 && result.body.error && result.body.error.includes('Player ID')) {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected 400 validation error\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 6: POST with empty nickname (validation error)
  console.log('Test 6: POST /api/settings (empty nickname - validation)');
  try {
    const result = await makeRequest('POST', '/api/settings', {
      playerId: 'bob-001',
      nickname: ''
    });
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 400 && result.body.error && result.body.error.includes('empty')) {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected 400 validation error for empty nickname\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 7: POST with invalid soundEnabled (validation error)
  console.log('Test 7: POST /api/settings (invalid soundEnabled - validation)');
  try {
    const result = await makeRequest('POST', '/api/settings', {
      playerId: 'charlie-001',
      soundEnabled: 'yes'
    });
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 400 && result.body.error && result.body.error.includes('boolean')) {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected 400 validation error for non-boolean soundEnabled\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 8: POST with long nickname (truncation)
  console.log('Test 8: POST /api/settings (long nickname - truncation)');
  try {
    const longNickname = 'a'.repeat(100);
    const result = await makeRequest('POST', '/api/settings', {
      playerId: 'dave-001',
      nickname: longNickname
    });
    console.log(`  Status: ${result.status}`);
    console.log(`  Nickname length: ${result.body.settings.nickname.length}`);
    
    if (result.status === 200 && result.body.settings.nickname.length === 50) {
      console.log('  ✅ PASS (nickname truncated to 50 chars)\n');
      passCount++;
    } else {
      console.log(`  ❌ FAIL - Expected nickname truncated to 50 chars, got ${result.body.settings.nickname.length}\n`);
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 9: GET /api/settings with empty playerId
  console.log('Test 9: GET /api/settings/ (empty playerId)');
  try {
    const result = await makeRequest('GET', '/api/settings/');
    console.log(`  Status: ${result.status}`);
    console.log(`  Response:`, result.body);
    
    if (result.status === 400 && result.body.error) {
      console.log('  ✅ PASS\n');
      passCount++;
    } else {
      console.log('  ❌ FAIL - Expected 400 error\n');
      failCount++;
    }
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }

  // Test 10: POST invalid JSON
  console.log('Test 10: POST /api/settings (invalid JSON)');
  try {
    const url = new URL('/api/settings', BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const result = JSON.parse(data);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Response:`, result);
        
        if (res.statusCode === 400 && result.error && result.error.includes('JSON')) {
          console.log('  ✅ PASS\n');
          passCount++;
        } else {
          console.log('  ❌ FAIL - Expected 400 JSON error\n');
          failCount++;
        }

        // Summary
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Tests Passed: ${passCount}`);
        console.log(`Tests Failed: ${failCount}`);
        console.log(`Total: ${passCount + failCount}`);
        console.log(`${'='.repeat(50)}`);
        
        process.exit(failCount > 0 ? 1 : 0);
      });
    });

    req.on('error', (e) => {
      console.log(`  ❌ FAIL - ${e.message}\n`);
      failCount++;
    });
    req.write('invalid json {');
    req.end();
  } catch (e) {
    console.log(`  ❌ FAIL - ${e.message}\n`);
    failCount++;
  }
}

// Start tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
