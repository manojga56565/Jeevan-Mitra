const mongoose = require('mongoose');
const { POINTS_BY_URGENCY, DEFAULT_REQUEST_EXPIRY_HOURS } = require('../config/constants');

// One entry per donor who has accepted a slot on this request. Tracked
// individually (not just a total count) because each donor's actual
// donation is verified and completed separately via QR scan, and each
// donor's own cooldown/points only start once THEIR donation completes —
// not when the whole request finishes.
const AcceptedDonorSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
    acceptedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['accepted', 'completed', 'no_show'], default: 'accepted' },
    completedAt: { type: Date, default: null },
    navigationUrl: { type: String, default: '' }
}, { _id: false });

const RequestSchema = new mongoose.Schema({

    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
    hospitalName: { type: String, required: true },
    hospitalCity: { type: String, required: true },
    hospitalPhone: { type: String, required: true },

    bloodGroup: {
        type: String,
        required: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    },

    matchingType: {
        type: String,
        enum: ['exact', 'compatible'],
        default: 'exact'
    },

    urgency: {
        type: String,
        enum: ['normal', 'urgent', 'emergency'],
        default: 'normal'
    },

    quantity: { type: Number, required: true, min: 1, max: 10 },

    // Replaces the old single `acceptedBy` field — supports multiple donors
    // filling one request, matching quantity.
    acceptedDonors: { type: [AcceptedDonorSchema], default: [] },

    patientName: { type: String, default: '' },
    patientAge: { type: Number, default: null },
    patientGender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    patientReason: { type: String, default: '' },
    patientReference: { type: String, default: '' }, // patient ID / reference number, separate from name

    department: { type: String, default: '' }, // Emergency / ICU / Surgery / Other
    contactPerson: { type: String, default: '' }, // staff handling THIS request — may differ from the hospital account's own contact person
    contactNumber: { type: String, default: '' },

    doctorRefNo: { type: String, default: '' },
    doctorName: { type: String, default: '' },

    // Overall lifecycle status. 'pending' while acceptedDonors.length < quantity,
    // 'accepted' once quantity is met but not all donors have completed yet,
    // 'completed' once every accepted donor's status is 'completed'.
    status: {
        type: String,
        enum: ['pending', 'accepted', 'completed', 'cancelled', 'expired'],
        default: 'pending'
    },

    districts: { type: [String], default: [] }, // multi-district posting
    searchRadiusKm: { type: Number, default: 20 },

    pointsEarned: { type: Number, default: 0 }, // per-donor points for this urgency level

    requiredBefore: { type: Date, default: null },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + DEFAULT_REQUEST_EXPIRY_HOURS * 60 * 60 * 1000)
    },

    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [78.4867, 17.3850] }
    }

}, { timestamps: true });

RequestSchema.index({ location: '2dsphere' });
RequestSchema.index({ status: 1, bloodGroup: 1 });
RequestSchema.index({ hospitalId: 1 });
RequestSchema.index({ expiresAt: 1 });

RequestSchema.pre('save', function (next) {
    if (!this.pointsEarned) {
        this.pointsEarned = POINTS_BY_URGENCY[this.urgency] || POINTS_BY_URGENCY.normal;
    }
    next();
});

// How many more donors can still accept this request right now
RequestSchema.virtual('remainingSlots').get(function () {
    const activeAcceptances = this.acceptedDonors.filter(d => d.status !== 'no_show').length;
    return Math.max(0, this.quantity - activeAcceptances);
});

RequestSchema.set('toJSON', { virtuals: true });
RequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Request', RequestSchema);
