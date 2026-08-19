const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

async function seedAdminIfNeeded() {
  try {
    const Admin = require('../models/Admin');
    const count = await Admin.countDocuments();
    if (count > 0) return;
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      logger.warn('No admin account exists yet, and ADMIN_EMAIL/ADMIN_PASSWORD are not set — set them in .env to auto-create the first admin login');
      return;
    }
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({ name: 'Admin', email: process.env.ADMIN_EMAIL.toLowerCase(), password: hashed });
    logger.success(`Seeded first admin account: ${process.env.ADMIN_EMAIL}`);
  } catch (err) {
    logger.error(`Admin seed failed: ${err.message}`);
  }
}

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      logger.warn('MONGODB_URI not set — backend will start but DB calls will fail until it is configured');
      return;
    }
    await mongoose.connect(uri);
    logger.success('MongoDB connected');
    await seedAdminIfNeeded();
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    // Don't crash the whole process on boot — let /api/health report it,
    // matches the pattern already used elsewhere in this codebase.
  }
}

module.exports = connectDB;
