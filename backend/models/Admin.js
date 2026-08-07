const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['super_admin', 'moderator'], default: 'moderator' },
  isActive:  { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

AdminSchema.methods.comparePassword = async function(pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema);
