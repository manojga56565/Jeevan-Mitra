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
        unique: true
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
        enum: [
            'A+',
            'A-',
            'B+',
            'B-',
            'O+',
            'O-',
            'AB+',
            'AB-'
        ]
    },

    age: {
        type: Number,
        required: true,
        min: 18,
        max: 65
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
        enum: [
            'available',
            'not available'
        ],
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
        otpCode: {
        type: String
    },

    otpExpiresAt: {
        type: Date
    },

    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },

    referredBy: {
        type: String
    },

    referralCount: {
        type: Number,
        default: 0
    },

    lastActiveAt: {
        type: Date
    }

}, {
    timestamps: true
});
// =====================================================
// HASH PASSWORD BEFORE SAVE
// =====================================================
DonorSchema.pre('save', async function (next) {

    try {

        if (!this.isModified('password')) {
            return next();
        }

        this.password = await bcrypt.hash(this.password, 10);

        next();

    } catch (err) {

        next(err);

    }

});
// =====================================================
// GENERATE REFERRAL CODE
// =====================================================
DonorSchema.pre('save', function (next) {

    if (!this.referralCode) {

        this.referralCode =
            'JM' +
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();

    }

    next();

});
// =====================================================
// COMPARE PASSWORD
// =====================================================
DonorSchema.methods.comparePassword = async function (password) {

    return bcrypt.compare(password, this.password);

};


// =====================================================
// CHECK DONOR ELIGIBILITY
// =====================================================
DonorSchema.methods.isEligibleToDonate = function () {

    if (!this.cooldownUntil) {
        return true;
    }

    return new Date() >= this.cooldownUntil;

};


// =====================================================
// REMAINING COOLDOWN DAYS
// =====================================================
DonorSchema.methods.remainingCooldownDays = function () {

    if (!this.cooldownUntil) {
        return 0;
    }

    const diff = this.cooldownUntil.getTime() - Date.now();

    if (diff <= 0) {
        return 0;
    }

    return Math.ceil(diff / (1000 * 60 * 60 * 24));

};


// =====================================================
// START 60 DAY COOLDOWN
// =====================================================
DonorSchema.methods.startCooldown = function () {

    const cooldownDate = new Date();

    cooldownDate.setDate(cooldownDate.getDate() + 60);

    this.lastDonationDate = new Date();

    this.nextEligibleDate = cooldownDate;

    this.cooldownUntil = cooldownDate;

};


// =====================================================
// ADD POINTS
// =====================================================
DonorSchema.methods.addPoints = function (points) {

    this.points += points;

};


// =====================================================
// DEDUCT POINTS
// =====================================================
DonorSchema.methods.deductPoints = function (points) {

    this.points = Math.max(0, this.points - points);

};
// =====================================================
// DATABASE INDEXES
// =====================================================
DonorSchema.index({ phone: 1 });

DonorSchema.index({ bloodGroup: 1, city: 1 });

DonorSchema.index({ referralCode: 1 });

DonorSchema.index({ cooldownUntil: 1 });


// =====================================================
// EXPORT MODEL
// =====================================================
module.exports = mongoose.model('Donor', DonorSchema);