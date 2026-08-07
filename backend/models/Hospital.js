const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const HospitalSchema = new mongoose.Schema({
  hospitalName:        { type: String, required: true, trim: true },
  hospitalType:        { type: String, enum: ['Government', 'Private', 'Trust', 'Other'], default: 'Private' },
  registrationNumber:  { type: String, required: true, unique: true }, // = License Number
  address:             { type: String, required: true },
  landmark:             { type: String, default: '' },
  district:             { type: String, default: '' },
  city:                { type: String, required: true },
  state:                { type: String, default: 'Telangana' },
  pincode:             { type: String, required: true },
  googleMapsLink:       { type: String, default: '' },
  contactPerson:       { type: String, required: true },
  designation:         { type: String },
  phone:               { type: String, required: true },
  emergencyContact:     { type: String, default: '' },
  email:               { type: String, required: true, unique: true, lowercase: true },
  licenseDocument:     { type: String },
  isVerified:          { type: Boolean, default: false },
  isActive:            { type: Boolean, default: true },
  password:            { type: String, required: true },
  totalRequests:       { type: Number, default: 0 },
  fulfilledRequests:   { type: Number, default: 0 },
  averageResponseTime: { type: Number, default: 0 },

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [78.4867, 17.3850] }
  }
}, { timestamps: true });

HospitalSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

HospitalSchema.methods.comparePassword = async function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

HospitalSchema.index({ city: 1 });
HospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', HospitalSchema);
