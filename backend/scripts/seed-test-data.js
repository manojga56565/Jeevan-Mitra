/**
 * Seeds one test Hospital and one test Admin document so the login /
 * forgot-password flows have something real to test against.
 *
 * Run from the backend folder:
 *   node scripts/seed-test-data.js
 *
 * Safe to run more than once — it skips anything that already exists.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const Admin = require('../models/Admin');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // ─── Test hospital ───
  const hospitalEmail = 'testhospital@jeevanmitra.in';
  let hospital = await Hospital.findOne({ email: hospitalEmail });
  if (hospital) {
    console.log('Hospital already exists:', hospitalEmail);
  } else {
    hospital = await Hospital.create({
      hospitalName: 'Test City Hospital',
      registrationNumber: 'TEST-REG-001',
      address: 'Somajiguda, Hyderabad',
      district: 'Hyderabad',
      city: 'Hyderabad',
      pincode: '500082',
      contactPerson: 'Dr. Test Admin',
      phone: '9000000001',
      email: hospitalEmail,
      password: 'hospital123',   // hashed automatically by the pre-save hook
      isVerified: true,          // pre-verified so login works immediately
      isActive: true
    });
    console.log('Created test hospital:');
    console.log('  email:', hospitalEmail);
    console.log('  password: hospital123');
  }

  // ─── Test admin (DB-backed, separate from the env-var admin) ───
  const adminEmail = 'testadmin@jeevanmitra.in';
  let admin = await Admin.findOne({ email: adminEmail });
  if (admin) {
    console.log('\nAdmin already exists:', adminEmail);
  } else {
    admin = await Admin.create({
      name: 'Test Admin',
      email: adminEmail,
      password: 'admin123',      // hashed automatically by the pre-save hook
      isActive: true
    });
    console.log('\nCreated test admin:');
    console.log('  email:', adminEmail);
    console.log('  password: admin123');
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
