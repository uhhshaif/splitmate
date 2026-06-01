const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(responseBody),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: responseBody,
          });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(responseBody),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: responseBody,
          });
        }
      });
    }).on('error', (err) => reject(err));
  });
}

async function runTests() {
  console.log('=== STARTING INTEGRATION TESTS FOR SPLITMATE ===\n');
  let passed = 0;
  let failed = 0;

  // TEST 1: Debt Simplification API Route
  try {
    console.log('Test 1: Testing /api/settlements/calculate...');
    const balances = {
      'u-alex': -50.00,
      'u-jessica': 20.00,
      'u-marcus': 30.00,
    };
    const res = await post('/api/settlements/calculate', { balances });
    
    if (res.statusCode === 200 && res.body.success) {
      console.log('✅ Test 1 Passed! Transactions optimized:', JSON.stringify(res.body.transactions));
      passed++;
    } else {
      console.error('❌ Test 1 Failed! Response:', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 1 Failed with error:', err.message);
    failed++;
  }

  // TEST 2: NLP Parsing Heuristics API Route
  try {
    console.log('\nTest 2: Testing /api/parse-nlp (slang heuristics)...');
    const payload = {
      text: 'I paid RM 60 for Groceries split equally with Jessica and Marcus',
      members: [
        { id: 'u-alex', display_name: 'Alex', email: 'alex@splitmate.com' },
        { id: 'u-jessica', display_name: 'Jessica', email: 'jessica@splitmate.com' },
        { id: 'u-marcus', display_name: 'Marcus', email: 'marcus@splitmate.com' },
      ],
      currentUserId: 'u-alex',
      dateContext: '2026-06-01'
    };
    const res = await post('/api/parse-nlp', payload);
    
    if (
      res.statusCode === 200 &&
      res.body.success &&
      res.body.amount === 60 &&
      res.body.description.toLowerCase().includes('groceries')
    ) {
      console.log('✅ Test 2 Passed! Parsed description:', res.body.description, '| Amount:', res.body.amount, '| Splits:', JSON.stringify(res.body.splits));
      passed++;
    } else {
      console.error('❌ Test 2 Failed! Response:', res);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 2 Failed with error:', err.message);
    failed++;
  }

  // TEST 3: Mobile Companion Link API Route
  try {
    console.log('\nTest 3: Testing /api/companion (phone linkage)...');
    const sessionId = `session_${Date.now()}`;
    
    // 1. Initially check state
    const res1 = await get(`/api/companion?sessionId=${sessionId}`);
    if (res1.body.status !== 'pending') {
      throw new Error(`Expected status to be pending, got ${res1.body.status}`);
    }

    // 2. Connect phone
    const res2 = await post('/api/companion', { sessionId, status: 'connected' });
    if (!res2.body.success) {
      throw new Error('Failed to set session status as connected');
    }

    // 3. Confirm phone connection
    const res3 = await get(`/api/companion?sessionId=${sessionId}`);
    if (res3.body.status !== 'connected') {
      throw new Error(`Expected status to be connected, got ${res3.body.status}`);
    }

    // 4. Upload photo from phone
    const dummyImage = 'data:image/jpeg;base64,iVBORw0KGgoAAAANS';
    const res4 = await post('/api/companion', { sessionId, image: dummyImage });
    if (!res4.body.success) {
      throw new Error('Failed to upload image from phone');
    }

    // 5. Consume photo on laptop
    const res5 = await get(`/api/companion?sessionId=${sessionId}`);
    if (res5.body.status !== 'completed' || res5.body.image !== dummyImage) {
      throw new Error(`Expected status completed and matching image, got status ${res5.body.status}`);
    }

    console.log('✅ Test 3 Passed! Sync sequence: pending -> connected -> completed (retrieved image)');
    passed++;
  } catch (err) {
    console.error('❌ Test 3 Failed with error:', err.message);
    failed++;
  }

  console.log('\n=== INTEGRATION TEST SUMMARY ===');
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
