const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },

  bloodGroup: { type: String, enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'], required: true, index: true },
  quantity: { type: Number, default: 1 },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  patientReference: String,
  patientName: String,
  doctorRefNo: String,
  patientReason: String,
  department: String,

  contactPerson: String,
  contactNumber: String,

  searchRadiusKm: { type: Number, default: 15 },
  requiredBefore: Date,
  notifyPush: { type: Boolean, default: true },

  latitude: Number,
  longitude: Number,

  status: { type: String, enum: ['open', 'accepted', 'completed', 'cancelled'], default: 'open', index: true },

  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  acceptedAt: Date,

  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  completedAt: Date,
  // Real points actually credited for this donation at the time it was
  // completed (see rewardService.js) — recorded here so donation history
  // shows the true amount even if the reward formula changes later.
  pointsEarned: Number
}, { timestamps: true });

// The donor feed and matching queries filter on these together constantly
requestSchema.index({ status: 1, bloodGroup: 1 });
requestSchema.index({ hospital: 1, status: 1 });

module.exports = mongoose.model('Request', requestSchema);
