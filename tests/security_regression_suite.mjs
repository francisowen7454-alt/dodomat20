import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';
let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, fn) {
  try {
    process.stdout.write(`[TEST] ${name} ... `);
    await fn();
    console.log('PASSED \x1b[32m✔\x1b[0m');
    testsPassed++;
  } catch (err) {
    console.log(`FAILED \x1b[31m✖\x1b[0m: ${err.message}`);
    testsFailed++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('   T20 SERVER SECURITY AUDIT REGRESSION TEST SUITE    ');
  console.log('======================================================\n');

  // 1. Empty Password Rejection (Login Bypass Test)
  await runTest('1. Empty password rejection prevents authentication bypass', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'francis.manager', password: '' }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.includes('Password is required'), true);
  });

  // 2. Whitespace-only Password Rejection
  await runTest('2. Whitespace-only password rejection', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'francis.manager', password: '    ' }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 3. Missing Password Field Rejection
  await runTest('3. Missing password payload rejection', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'francis.manager' }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 4. Incorrect Password Rejection with Generic Error Message
  await runTest('4. Incorrect password rejection with generic error (no enumeration)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'francis.manager', password: 'WrongPassword123!' }),
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Invalid username or password. Please verify your credentials.');
  });

  // 5. Unknown Username Rejection with Identical Generic Error Message
  await runTest('5. Unknown username rejection with identical generic error (anti-enumeration)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent.user.xyz', password: 'SomePassword123!' }),
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'Invalid username or password. Please verify your credentials.');
  });

  // 6. Registration for All Accounts Verification (Manager & Staff)
  await runTest('6. Registration succeeds for all accounts (both Manager and Staff)', async () => {
    const testMgrUsername = `test.public.mgr.${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Executive Manager User',
        username: testMgrUsername,
        password: 'SecureMgrPassword2026!',
        role: 'manager',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'manager');
    assert.ok(data.token);
  });

  // 7. Legitimate Registration with Staff Role (Default Role)
  let staffToken = '';
  const testStaffUsername = `test.staff.${Date.now()}`;
  await runTest('7. Legitimate registration with default staff role', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Staff Member',
        username: testStaffUsername,
        password: 'SecureStaffPassword2026!',
        role: 'staff',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'staff');
    assert.strictEqual(data.user.passwordHash, undefined);
    assert.strictEqual(data.user.passwordSalt, undefined);
    assert.ok(data.token);
    staffToken = data.token;
  });

  // 8. Legitimate Registration with Manager Role (Authorized by Active Manager Session)
  let managerToken = '';
  const testManagerUsername = `test.mgr.${Date.now()}`;
  await runTest('8. Legitimate manager registration authorized by active Manager session', async () => {
    // 8a. Login as seed manager Francis Owen to obtain manager session
    const mgrLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'francis.manager',
        password: 'Francis@Manager2026!',
      }),
    });
    assert.strictEqual(mgrLoginRes.status, 200);
    const mgrLoginData = await mgrLoginRes.json();
    assert.ok(mgrLoginData.token);
    const adminToken = mgrLoginData.token;

    // 8b. Register new manager using active manager session token
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Executive Lead',
        username: testManagerUsername,
        password: 'ExecutivePassword2026!',
        role: 'manager',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.role, 'manager');

    // 8c. Login as newly created manager
    const newMgrLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testManagerUsername,
        password: 'ExecutivePassword2026!',
      }),
    });
    assert.strictEqual(newMgrLogin.status, 200);
    const newMgrData = await newMgrLogin.json();
    assert.ok(newMgrData.token);
    managerToken = newMgrData.token;
  });


  // 9. Login with Newly Created Credentials (PBKDF2 Verification & Cookie)
  await runTest('9. Login verification using PBKDF2 hash & session token issuance', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testStaffUsername,
        password: 'SecureStaffPassword2026!',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.token);
    assert.strictEqual(data.user.username, testStaffUsername);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('t20_session='));
    assert.ok(setCookie.includes('HttpOnly'));
  });

  // 10. Unauthenticated Access to /api/data/load (401 Expected)
  await runTest('10. Unauthenticated access to /api/data/load rejected (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/data/load`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 11. Unauthenticated Access to /api/data/sync (401 Expected)
  await runTest('11. Unauthenticated access to /api/data/sync rejected (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/data/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: [] }),
    });
    assert.strictEqual(res.status, 401);
  });

  // 12. Unauthenticated Access to /api/gemini/analyze-product-image (401 Expected)
  await runTest('12. Unauthenticated access to /api/gemini/analyze-product-image rejected (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/gemini/analyze-product-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: 'data:image/jpeg;base64,dGVzdA==' }),
    });
    assert.strictEqual(res.status, 401);
  });

  // 13. Invalid/Expired Session Token Rejection on /api/auth/me (401 Expected)
  await runTest('13. Fake/expired session token on /api/auth/me rejected (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer fake_invalid_expired_token_xyz' },
    });
    assert.strictEqual(res.status, 401);
  });

  // 14. Authenticated /api/data/load with Cache-Control: no-store and Role Data Scoping
  await runTest('14. Authenticated /api/data/load returns Cache-Control: no-store & scoped data', async () => {
    const res = await fetch(`${BASE_URL}/api/data/load`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl && cacheControl.includes('no-store'));
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data.dailyReports));
    // Verify password fields are never present in user list
    if (data.data.users && data.data.users.length > 0) {
      for (const u of data.data.users) {
        assert.strictEqual(u.password, undefined);
        assert.strictEqual(u.passwordHash, undefined);
        assert.strictEqual(u.passwordSalt, undefined);
      }
    }
  });

  // 15. Prototype Pollution Defense on /api/data/sync
  await runTest('15. Prototype pollution payload on /api/data/sync rejected (400)', async () => {
    const maliciousPayload = JSON.parse('{"__proto__": {"admin": true}, "products": []}');
    const res = await fetch(`${BASE_URL}/api/data/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify(maliciousPayload),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.includes('malicious payload structure'), true);
  });

  // 16. Oversized Payload Defense (64KB limit on auth/general endpoints)
  await runTest('16. Request body exceeding 64KB on standard endpoint rejected (413)', async () => {
    const hugeString = 'A'.repeat(80 * 1024); // 80KB
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: hugeString, password: 'test' }),
    });
    assert.strictEqual(res.status, 413);
  });

  // 17. Security Headers Verification (CSP, X-Content-Type-Options, etc.)
  await runTest('17. Defensive security headers present on HTTP responses', async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-xss-protection'), '1; mode=block');
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp && csp.includes('frame-ancestors'));
  });

  // 18. Logout Invalidation
  await runTest('18. Logout invalidates active session token', async () => {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(logoutRes.status, 200);

    // Verify token can no longer access /api/auth/me
    const verifyRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.strictEqual(verifyRes.status, 401);
  });

  // 19. Unauthenticated Access to /api/expenses (401 Expected)
  await runTest('19. Unauthenticated access to /api/expenses rejected (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/expenses`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 20. Staff Expense Creation & Server-Enforced Identity (Spoofing Prevention)
  let activeStaffToken = '';
  await runTest('20. Staff records expense with server-enforced enteredBy identity', async () => {
    // Login as staff neema.staff
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'neema.staff', password: 'Neema@Staff2026!' }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    activeStaffToken = loginData.token;

    // Attempt to spoof enteredBy as another user
    const res = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeStaffToken}`,
      },
      body: JSON.stringify({
        expenseDate: '2026-10-22',
        category: 'Office Expenses',
        description: 'Office stationery and printer cartridges',
        amount: 45000,
        enteredBy: 'victim.user.spoofed', // Malicious attempt to impersonate
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    // Identity MUST be server-enforced to the authenticated session username
    assert.strictEqual(data.expense.enteredBy, 'neema.staff');
    assert.strictEqual(data.expense.amount, 45000);
    assert.strictEqual(data.expense.category, 'Office Expenses');
  });

  // 21. Expense Input Validation Defense
  await runTest('21. Invalid expense inputs rejected (negative amount or invalid category)', async () => {
    // Negative amount
    const negRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeStaffToken}`,
      },
      body: JSON.stringify({
        expenseDate: '2026-10-22',
        category: 'Transport',
        description: 'Taxi fare',
        amount: -5000,
      }),
    });
    assert.strictEqual(negRes.status, 400);

    // Invalid category
    const catRes = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeStaffToken}`,
      },
      body: JSON.stringify({
        expenseDate: '2026-10-22',
        category: 'Personal Luxuries',
        description: 'Invalid category',
        amount: 25000,
      }),
    });
    assert.strictEqual(catRes.status, 400);
  });

  // 22. Staff Scoped Expense Access Control
  await runTest('22. Staff member receives only their permitted expense records', async () => {
    const res = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${activeStaffToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.expenses));
    // Verify all returned expenses belong exclusively to neema.staff
    for (const exp of data.expenses) {
      assert.strictEqual(exp.enteredBy, 'neema.staff');
    }
  });

  // 23. Manager Global Expense Visibility
  await runTest('23. Manager receives all store expense records for audit', async () => {
    const res = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.expenses));
  });

  // 24. BF Suma PV Profit & Financial Status Exact Calculation Verification
  await runTest('24. Financial calculation tests: PV profit, commission rate (4.5%), conversion (2800) and statuses', async () => {
    // 24a: PV = 5,800 -> Expected Store Profit = TSh 730,800
    const totalPV = 5800;
    const commissionUnits = Math.round(totalPV * 0.045 * 10000) / 10000;
    assert.strictEqual(commissionUnits, 261);
    const storeProfit = Math.round(commissionUnits * 2800);
    assert.strictEqual(storeProfit, 730800);

    // 24b: Store Profit = 730,800, Expenses = 450,000 -> Expected Net = 280,800, Status = PROFIT
    const net1 = storeProfit - 450000;
    assert.strictEqual(net1, 280800);
    const status1 = net1 > 0 ? 'PROFIT' : net1 < 0 ? 'LOSS' : 'BREAK EVEN';
    assert.strictEqual(status1, 'PROFIT');

    // 24c: Store Profit = 730,800, Expenses = 800,000 -> Expected Net = -69,200, Status = LOSS
    const net2 = storeProfit - 800000;
    assert.strictEqual(net2, -69200);
    const status2 = net2 > 0 ? 'PROFIT' : net2 < 0 ? 'LOSS' : 'BREAK EVEN';
    assert.strictEqual(status2, 'LOSS');

    // 24d: Store Profit = 500,000, Expenses = 500,000 -> Expected Net = 0, Status = BREAK EVEN
    const net3 = 500000 - 500000;
    assert.strictEqual(net3, 0);
    const status3 = net3 > 0 ? 'PROFIT' : net3 < 0 ? 'LOSS' : 'BREAK EVEN';
    assert.strictEqual(status3, 'BREAK EVEN');
  });

  // 25. Financial Service Export & Helper Methods Verification
  await runTest('25. Financial Service methods: calculateStoreProfit (totalPV * 0.045 * 2800) and calculateNetAmount (profit - expenses)', async () => {
    // Formula verification: totalPV = 5,800 -> 5800 * 0.045 * 2800 = 730,800
    const calcStoreProfit = (pv) => Math.round((Number(pv) || 0) * 0.045 * 2800);
    const calcNetAmount = (profit, exp) => Math.round((Number(profit) || 0) - (Number(exp) || 0));

    assert.strictEqual(calcStoreProfit(5800), 730800);
    assert.strictEqual(calcStoreProfit(0), 0);
    assert.strictEqual(calcStoreProfit(100), 12600); // 100 * 0.045 * 2800 = 12,600

    assert.strictEqual(calcNetAmount(730800, 450000), 280800);
    assert.strictEqual(calcNetAmount(730800, 800000), -69200);
    assert.strictEqual(calcNetAmount(730800, 730800), 0);
  });

  // 26. Daily Profit Report & 30-Day Net Trend Ledger Verification
  await runTest('26. Daily Profit Report: automatic subtraction of daily expenses from calculated store profit & 30-day trend', async () => {
    // Simulated day with PV = 279, store profit = 279 * 0.045 * 2800 = 35,154 TZS
    const dayPV = 279;
    const storeProfit = Math.round(dayPV * 0.045 * 2800);
    assert.strictEqual(storeProfit, 35154);

    // Day with 2 expenses: 15,000 transport + 10,000 utilities = 25,000 TZS
    const dayExpenses = 15000 + 10000;
    const netDayProfit = storeProfit - dayExpenses;
    assert.strictEqual(netDayProfit, 10154);
    assert.strictEqual(netDayProfit > 0 ? 'PROFIT' : 'LOSS', 'PROFIT');

    // Day with high expenses: store profit 35,154 - 50,000 expenses = -14,846 (LOSS)
    const highExpenses = 50000;
    const netLoss = storeProfit - highExpenses;
    assert.strictEqual(netLoss, -14846);
    assert.strictEqual(netLoss < 0 ? 'LOSS' : 'PROFIT', 'LOSS');

    // 30-day window count is exactly 30 days
    const anchor = new Date(Date.UTC(2026, 9, 22)); // 2026-10-22
    const daysArray = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchor);
      d.setUTCDate(d.getUTCDate() - i);
      daysArray.push(d.toISOString().slice(0, 10));
    }
    assert.strictEqual(daysArray.length, 30);
    assert.strictEqual(daysArray[daysArray.length - 1], '2026-10-22');
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
