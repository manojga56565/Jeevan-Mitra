/**
 * End-to-end test of every auth flow, run against YOUR running server.
 *
 * Before running this:
 *   1. In one terminal: npm start          (leave it running)
 *   2. In another terminal, from backend/:  node scripts/seed-test-data.js
 *   3. Then, still in that second terminal: node scripts/test-flows.js
 *
 * No extra packages needed — uses Node's built-in fetch (Node 18+).
 */

const BASE = 'http://localhost:5000/api';
let pass = 0, fail = 0;

function ok(label, condition, detail = '') {
  if (condition) { console.log(`  ✅ ${label}`); pass++; }
  else { console.log(`  ❌ ${label}  ${detail}`); fail++; }
}

async function call(path, method = 'GET', body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  console.log('\n=== 1. Health check ===');
  const health = await call('/health');
  ok('server responds', health.status === 200 && health.json.success === true);

  console.log('\n=== 2. Donor registration → OTP verify ===');
  const phone = '90000' + Math.floor(10000 + Math.random() * 89999); // fresh number each run
  const donorPayload = {
    phone, name: 'Test Donor', city: 'Hyderabad', bloodGroup: 'O+',
    age: 25, weight: 60, dateOfBirth: '1999-01-01', gender: 'male',
    district: 'Hyderabad', homeTown: 'Warangal', livingTown: 'Hyderabad',
    emergencyContact: '9123456780', email: 'testdonor@example.com'
  };
  const sendOtp = await call('/auth/donor/send-otp', 'POST', donorPayload);
  ok('OTP sent', sendOtp.status === 200 && !!sendOtp.json.otp, JSON.stringify(sendOtp.json));

  const verify = await call('/auth/donor/verify-otp', 'POST', { phone, otp: sendOtp.json.otp });
  ok('OTP verified, donor created', verify.status === 200 && !!verify.json.token, JSON.stringify(verify.json));

  const donor = verify.json.donor || {};
  console.log('\n  --- checking the new fields actually persisted ---');
  ok('gender saved',          donor.gender === 'male',          `got: ${donor.gender}`);
  ok('district saved',        donor.district === 'Hyderabad',   `got: ${donor.district}`);
  ok('homeTown saved',        donor.homeTown === 'Warangal',    `got: ${donor.homeTown}`);
  ok('livingTown saved',      donor.livingTown === 'Hyderabad', `got: ${donor.livingTown}`);
  ok('emergencyContact saved',donor.emergencyContact === '9123456780', `got: ${donor.emergencyContact}`);
  ok('dateOfBirth saved',     !!donor.dateOfBirth,              `got: ${donor.dateOfBirth}`);

  const donorToken = verify.json.token;

  console.log('\n=== 3. Quick login (existing donor, phone-only) ===');
  const quickOtp = await call('/auth/donor/send-otp', 'POST', { phone });
  ok('quick-login OTP sent', quickOtp.status === 200 && !!quickOtp.json.otp);
  const quickVerify = await call('/auth/donor/verify-otp', 'POST', { phone, otp: quickOtp.json.otp });
  ok('quick-login succeeds, same donor', quickVerify.status === 200 && quickVerify.json.donor?.phone === phone);

  console.log('\n=== 4. Hospital login (needs scripts/seed-test-data.js run first) ===');
  const hLogin = await call('/auth/hospital/login', 'POST', { email: 'testhospital@jeevanmitra.in', password: 'hospital123' });
  ok('hospital login', hLogin.status === 200 && !!hLogin.json.token, JSON.stringify(hLogin.json));

  console.log('\n=== 5. Admin login — env-based ===');
  const aLoginEnv = await call('/auth/admin/login', 'POST', { email: process.env.ADMIN_EMAIL || 'admin@jeevanmitra.in', password: process.env.ADMIN_PASSWORD || '' });
  ok('env-admin login', aLoginEnv.status === 200 && !!aLoginEnv.json.token, 'set ADMIN_EMAIL/ADMIN_PASSWORD env vars before running this script if this fails');

  console.log('\n=== 6. Admin login — DB-backed test admin ===');
  const aLoginDb = await call('/auth/admin/login', 'POST', { email: 'testadmin@jeevanmitra.in', password: 'admin123' });
  ok('DB-admin login', aLoginDb.status === 200 && !!aLoginDb.json.token, JSON.stringify(aLoginDb.json));

  console.log('\n=== 7. Forgot / reset password (hospital) ===');
  const fp = await call('/auth/forgot-password', 'POST', { role: 'hospital', identifier: 'testhospital@jeevanmitra.in' });
  ok('reset code sent', fp.status === 200 && !!fp.json.code, JSON.stringify(fp.json));

  const rp = await call('/auth/reset-password', 'POST', {
    role: 'hospital', identifier: 'testhospital@jeevanmitra.in', code: fp.json.code, newPassword: 'hospital123'
  });
  ok('password reset (back to same password)', rp.status === 200, JSON.stringify(rp.json));

  const reLogin = await call('/auth/hospital/login', 'POST', { email: 'testhospital@jeevanmitra.in', password: 'hospital123' });
  ok('login with reset password works', reLogin.status === 200 && !!reLogin.json.token);

  console.log('\n=== 8. Wrong role / wrong token rejected ===');
  const wrongRole = await call('/donors/photo', 'POST', null, aLoginEnv.json.token);
  ok('admin token blocked from donor-only route', wrongRole.status === 403, JSON.stringify(wrongRole.json));

  console.log(`\n\n${'='.repeat(40)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(40)}\n`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('Test script crashed:', e); process.exit(1); });
