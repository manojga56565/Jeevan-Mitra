/**
 * findCorruptedDonors.js
 *
 * One-off audit script for the Quick Login data-corruption bug.
 * Before the fix, quickLoginOTP() sent name:'User', city:'Hyderabad' on
 * EVERY login attempt, and the backend overwrote any existing donor's real
 * name/city with those values whenever present in the request body. This
 * script finds donors whose current name/city still match those exact
 * placeholder values, so you know which real accounts were affected.
 *
 * This script is READ-ONLY — it does not modify any data. Run it, review
 * the list, and fix each one manually (or tell me which donors are your
 * own test accounts vs real ones and I'll write a targeted update).
 *
 * Usage:
 *   cd backend
 *   node scripts/findCorruptedDonors.js
 *
 * Requires MONGODB_URI (or MONGO_URI) to already be set in your .env,
 * same as the main server uses.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Donor = require('../models/Donor');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
  if (!MONGO_URI) {
    console.error('No MONGODB_URI / MONGO_URI found in your .env — aborting.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  // Exact match on the literal placeholder values the old bug injected.
  const suspects = await Donor.find({ name: 'User', city: 'Hyderabad' })
    .select('name phone city bloodGroup createdAt updatedAt')
    .sort('-updatedAt');

  if (!suspects.length) {
    console.log('No donors found with name="User" and city="Hyderabad". Nothing to clean up.');
  } else {
    console.log(`Found ${suspects.length} donor(s) matching the corrupted placeholder values:\n`);
    suspects.forEach((d, i) => {
      console.log(
        `${i + 1}. _id=${d._id}  phone=${d.phone}  bloodGroup=${d.bloodGroup || '(not set)'}  ` +
        `createdAt=${d.createdAt?.toISOString()}  updatedAt=${d.updatedAt?.toISOString()}`
      );
    });
    console.log(
      '\nNote: this can also legitimately match someone who registered with the ' +
      'real name "User" and city "Hyderabad" by coincidence — check createdAt vs ' +
      'updatedAt (a big gap, or an updatedAt shortly after this bug was live, is a ' +
      'strong signal it was actually overwritten by the bug rather than entered by hand).'
    );
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
