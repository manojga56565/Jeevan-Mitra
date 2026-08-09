const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');

/**
 * The QR encodes a short-lived signed token containing just the donor ID —
 * not raw donor data — so scanning it requires hitting our backend to look
 * up current, live info (avoids showing stale cached data on scan, and
 * avoids putting any personal data directly in a scannable/shareable code).
 */
async function generateDonorQR(donorId) {
  const qrToken = jwt.sign(
    { donorId, type: 'donor-qr' },
    process.env.JWT_SECRET,
    { expiresIn: '365d' } // long-lived — it's just an identifier, re-verified server-side on every scan
  );
  const dataUrl = await QRCode.toDataURL(qrToken, { width: 300, margin: 1 });
  return { qrToken, dataUrl };
}

function verifyDonorQR(qrToken) {
  const decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
  if (decoded.type !== 'donor-qr') throw new Error('Invalid QR code type');
  return decoded.donorId;
}

module.exports = { generateDonorQR, verifyDonorQR };
