const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DonorSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    phone: {
        type: String,
        required: true,
        unique: true // unique already creates an index — no need for a separate .index({phone:1}) below
    },

    email: {
        type: String,
        default: '',
        lowercase: true
    },

    city: {
        type: String,
        required: true
    },

    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    },

    age: {
        type: Number,
        required: true,
        min: 18,
        max: 65
    },

    dateOfBirth: {
        type: Date,
        default: null
    },

    gender: {
        type: String,
        enum: ['male', 'female', 'other', ''],
        default: ''
    },

    district: {
        type: String,
        default: ''
    },

    homeTown: {
        type: String,
        default: ''
    },

    livingTown: {
        type: String,
        default: ''
    },

    emergencyContact: {
        type: String,
        default: ''
    },

    profilePhotoUrl: {
        type: String,
        default: ''
    },

    weight: {
        type: Number,
        required: true,
        min: 45
    },

    password: {
        type: String,
        required: true
    },

    isPhoneVerified: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    availabilityStatus: {
        type: String,
        enum: ['available', 'not available'],
        default: 'available'
    },

    points: {
        type: Number,
        default: 0
    },

    totalDonations: {
        type: Number,
        default: 0
    },

    lastDonationDate: {
        type: Date,
        default: null
    },

    nextEligibleDate: {
        type: Date,
        default: null
    },

    cooldownUntil: {
        type: Date,
        default: null
    },

    otpCode: { type: String },
    otpExpiresAt: { type: Date },

    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },

    referredBy: { type: String },
    referralCount: { type: Number, default: 0 },
    lastActiveAt: { type: Date },

    // Added for QR verification (utils/qrGenerator.js signs against donor._id,
    // this just tracks when it was last issued/rotated)
    qrIssuedAt: { type: Date, default: Date.now }

}, { timestamps: true });

DonorSchema.pre('save', async function (next) {
    try {
        if (!this.isModified('password')) return next();
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (err) {
        next(err);
    }
});

DonorSchema.pre('save', function (next) {
    if (!this.referralCode) {
        this.referralCode = 'JM' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
});

DonorSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

DonorSchema.methods.isEligibleToDonate = function () {
    if (!this.cooldownUntil) return true;
    return new Date() >= this.cooldownUntil;
};

DonorSchema.methods.remainingCooldownDays = function () {
    if (!this.cooldownUntil) return 0;
    const diff = this.cooldownUntil.getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

DonorSchema.methods.startCooldown = function () {
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() + 60);
    this.lastDonationDate = new Date();
    this.nextEligibleDate = cooldownDate;
    this.cooldownUntil = cooldownDate;
    this.availabilityStatus = 'not available';
};

DonorSchema.methods.addPoints = function (points) {
    this.points += points;
};

DonorSchema.methods.deductPoints = function (points) {
    this.points = Math.max(0, this.points - points);
};

DonorSchema.index({ bloodGroup: 1, city: 1 });
DonorSchema.index({ cooldownUntil: 1 });

module.exports = mongoose.model('Donor', DonorSchema);
