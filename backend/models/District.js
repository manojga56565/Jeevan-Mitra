const mongoose = require('mongoose');

const DistrictSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true, trim: true },
  state:    { type: String, default: 'Telangana' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('District', DistrictSchema);
