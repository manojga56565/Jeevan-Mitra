/**
 * A simple pin/search link — works before a donor has "accepted" anything,
 * just shows where the hospital is.
 */
function buildSearchLink(lat, lng) {
  if (lat === undefined || lng === undefined) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * A turn-by-turn directions link — used once a donor accepts, so the app
 * can auto-open real navigation instead of just a pin.
 */
function buildDirectionsLink(lat, lng) {
  if (lat === undefined || lng === undefined) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

module.exports = { buildSearchLink, buildDirectionsLink };
