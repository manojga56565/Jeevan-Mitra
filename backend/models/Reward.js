const mongoose = require('mongoose');

const RedemptionSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  redeemedAt: { type: Date, default: Date.now },
  pointsSpent: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' }
}, { _id: false });

const RewardSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  pointsCost:  { type: Number, required: true, min: 1 },
  icon:        { type: String, default: '🎁' },
  isActive:    { type: Boolean, default: true },
  stock:       { type: Number, default: null }, // null = unlimited
  redemptions: { type: [RedemptionSchema], default: [] }
}, { timestamps: true });

RewardSchema.index({ isActive: 1 });

module.exports = mongoose.model('Reward', RewardSchema);
