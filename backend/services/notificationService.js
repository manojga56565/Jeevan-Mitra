const Notification = require('../models/Notification');

/**
 * Notifies a specific list of users (e.g. matched donors). Creates one
 * Notification doc per recipient so each has their own read/unread state,
 * and emits live over the socket room the client joined with their user id
 * (see server.js: socket.on('join', userId) -> socket.join(userId)).
 */
async function notifyUsers({ userIds, recipientModel, title, message, io, event = 'notification:new' }) {
  const docs = await Notification.insertMany(
    userIds.map((id) => ({
      title,
      message,
      targetRole: recipientModel === 'Donor' ? 'donor' : 'hospital',
      recipientId: id,
      recipientModel,
    }))
  );

  if (io) {
    docs.forEach((doc) => {
      io.to(String(doc.recipientId)).emit(event, doc);
    });
  }

  return docs;
}

module.exports = { notifyUsers };
