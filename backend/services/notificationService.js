const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

async function create({ recipientType, recipientId, type, title, message, relatedRequest, relatedDonor, relatedHospital, responseStatus }) {
  const notif = await Notification.create({
    recipientType, recipientId, type, title, message,
    relatedRequest: relatedRequest || null,
    relatedDonor: relatedDonor || null,
    relatedHospital: relatedHospital || null,
    responseStatus: responseStatus || 'n/a'
  });

  // Push live if they're connected right now; harmless no-op if not (they'll
  // still see it next time they fetch their notification list).
  const io = getIO();
  if (io) io.to(`user:${recipientId}`).emit('notification', notif);

  return notif;
}

async function listForUser(recipientType, recipientId, limit = 50) {
  return Notification.find({ recipientType, recipientId }).sort({ createdAt: -1 }).limit(limit);
}

async function markRead(notificationId, recipientId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipientId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
}

async function respondToRequestAlert(recipientId, requestId, response) {
  return Notification.findOneAndUpdate(
    { recipientId, relatedRequest: requestId, type: 'blood_request' },
    { responseStatus: response },
    { new: true }
  );
}

/**
 * Admin broadcast — pushes to everyone with the given role currently
 * connected, and does NOT persist per-user (that would mean writing one
 * Notification per donor/hospital in the system). For a project this size,
 * live-only broadcast is the right tradeoff; flagged clearly rather than
 * silently only half-working.
 */
function broadcast(target, message) {
  const io = getIO();
  if (!io) return false;
  const room = target === 'donors' ? 'donors' : target === 'hospitals' ? 'hospitals' : null;
  if (room) io.to(room).emit('broadcast', { message, sentAt: new Date() });
  else io.emit('broadcast', { message, sentAt: new Date() });
  return true;
}

module.exports = { create, listForUser, markRead, respondToRequestAlert, broadcast };
