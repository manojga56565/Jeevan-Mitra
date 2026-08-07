const mongoose = require('mongoose');

const SystemLogSchema = new mongoose.Schema({
  adminId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  adminEmail: { type: String },
  action:     { type: String, required: true },
  target:     { type: String, enum: ['donor', 'hospital', 'request', 'admin'] },
  targetId:   { type: mongoose.Schema.Types.ObjectId },
  details:    { type: String },
  ipAddress:  { type: String }
}, { timestamps: true });

SystemLogSchema.index({ adminId: 1 });
SystemLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SystemLog', SystemLogSchema);
