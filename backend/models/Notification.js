const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['donor', 'hospital', 'admin'], required: true },
  recipientId:   { type: mongoose.Schema.Types.ObjectId, required: true },

  type: {
    type: String,
    enum: [
      'blood_request',       // sent to a matched donor when a new request fits them
      'request_accepted',    // sent to the hospital when a donor accepts
      'donor_on_the_way',
      'donation_completed',
      'hospital_approved',
      'hospital_rejected',
      'broadcast',
      'system'
    ],
    required: true
  },

  title:   { type: String, required: true },
  message: { type: String, required: true },

  relatedRequest:  { type: mongoose.Schema.Types.ObjectId, ref: 'Request', default: null },
  relatedDonor:    { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', default: null },
  relatedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },

  // Used specifically for blood_request notifications, to track the donor's
  // response to a specific alert (replaces the old standalone Alert model)
  responseStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'n/a'],
    default: 'n/a'
  },

  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null }

}, { timestamps: true });

NotificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });
NotificationSchema.index({ relatedRequest: 1 });
NotificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
