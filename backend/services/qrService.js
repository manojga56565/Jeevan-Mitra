const crypto = require('crypto');

// The QR code encodes ONLY this token — never name, blood group, or any
// other personal data. A hospital scan looks the donor up server-side by
// this token via GET /api/donors/verify/:token, which is the only place
// donor details are ever returned from a scan.
function generateQRToken() {
  return crypto.randomBytes(24).toString('hex');
}

// What the frontend renders into the QR image.
function buildDonorQRPayload(donor) {
  return donor.qrToken;
}

module.exports = { generateQRToken, buildDonorQRPayload };
