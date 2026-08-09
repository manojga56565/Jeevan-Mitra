/**
 * Normalizes an Indian phone number to a plain 10-digit string, regardless
 * of how it was entered — with or without +91, spaces, or dashes.
 *
 * '9876543210'      -> '9876543210'
 * '+91 9876543210'  -> '9876543210'
 * '+919876543210'   -> '9876543210'
 * '91-9876543210'   -> '9876543210'
 *
 * Without this, the same person could accidentally end up with more than
 * one account depending on exactly how they typed their number.
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digitsOnly = String(phone).replace(/\D/g, '');
  return digitsOnly.slice(-10);
}

module.exports = { normalizePhone };
