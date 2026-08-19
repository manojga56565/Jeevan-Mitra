// Donors join a personal room (donor:<id>) and a blood-group room
// (donors:group:<bloodGroup>) on connect — see sockets/socketHandler.js.
// Emitting to only the compatible blood-group rooms means an incompatible
// donor's client never receives the event at all, not just "receives it
// but the UI hides it" — the popup-suppression lives on the server, not
// as a frontend filter that a modified client could ignore.

function notifyDonorsByBloodGroup(io, compatibleDonorGroups, event, payload) {
  if (!io) return;
  compatibleDonorGroups.forEach(group => io.to(`donors:group:${group}`).emit(event, payload));
}

function notifyDonor(io, donorId, event, payload) {
  if (!io) return;
  io.to(`donor:${donorId}`).emit(event, payload);
}

// Legacy broadcast-to-all-donors, still used for admin broadcast messages
// (which are intentionally for every donor, not blood-group-scoped).
function notifyDonors(io, event, payload) {
  if (!io) return;
  io.to('donors').emit(event, payload);
}

function notifyHospital(io, hospitalId, event, payload) {
  if (!io) return;
  io.to(`hospital:${hospitalId}`).emit(event, payload);
}

function notifyAdmins(io, event, payload) {
  if (!io) return;
  io.to('admins').emit(event, payload);
}

module.exports = { notifyDonorsByBloodGroup, notifyDonor, notifyDonors, notifyHospital, notifyAdmins };
