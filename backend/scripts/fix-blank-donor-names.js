/**
 * One-time fix for old donor records saved with a blank name (created
 * before the OTP-registration bug was fixed). Gives each one a fallback
 * name like "Donor 8481" (last 4 digits of their phone) so the admin
 * dashboard shows something useful instead of a blank dash.
 *
 * Run from the backend folder:
 *   node scripts/fix-blank-donor-names.js
 *
 * Safe to run more than once — donors that already have a real name are
 * left untouched.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Donor = require('../models/Donor');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const blank = await Donor.find({ $or: [{ name: '' }, { name: null }, { name: { $exists: false } }] });

  if (!blank.length) {
    console.log('No donors with a blank name — nothing to fix.');
  } else {
    console.log(`Found ${blank.length} donor(s) with a blank name:\n`);
    for (const donor of blank) {
      const last4 = String(donor.phone || '').slice(-4) || '????';
      const fallbackName = `Donor ${last4}`;
      donor.name = fallbackName;
      await donor.save();
      console.log(`  Fixed: ${donor.phone} -> "${fallbackName}"`);
    }
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fix script failed:', err.message);
  process.exit(1);
});
