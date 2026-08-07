module.exports = {
  BLOOD_GROUPS: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],

  // A+ can receive from A+, A-, O+, O- ; O- can only receive from O- ; etc.
  // Used by matchingService to find compatible (not just exact) donors.
  COMPATIBLE_DONORS: {
    'A+':  ['A+', 'A-', 'O+', 'O-'],
    'A-':  ['A-', 'O-'],
    'B+':  ['B+', 'B-', 'O+', 'O-'],
    'B-':  ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // universal recipient
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+':  ['O+', 'O-'],
    'O-':  ['O-'] // universal donor, but can only receive O-
  },

  URGENCY_LEVELS: ['normal', 'urgent', 'emergency'],
  REQUEST_STATUS: ['pending', 'accepted', 'completed', 'cancelled', 'expired'],

  POINTS_BY_URGENCY: { normal: 10, urgent: 20, emergency: 30 },

  COOLDOWN_DAYS: 60,
  MIN_DONATION_AGE: 18,
  MAX_DONATION_AGE: 65,
  MIN_DONATION_WEIGHT: 45,

  DEFAULT_REQUEST_EXPIRY_HOURS: 24,
  MIN_REQUEST_EXPIRY_HOURS: 6,
  MAX_REQUEST_EXPIRY_HOURS: 24,

  DEFAULT_SEARCH_RADIUS_KM: 20,

  OTP_LENGTH: 6,
  OTP_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes

  DEFAULT_MAP_COORDS: { lat: 17.3850, lng: 78.4867 }, // Hyderabad — only used if geolocation truly unavailable

  REWARD_TIERS: [
    { name: 'Bronze', minPoints: 0,    icon: '🥉' },
    { name: 'Silver', minPoints: 200,  icon: '🥈' },
    { name: 'Gold',   minPoints: 500,  icon: '🥇' },
    { name: 'Platinum', minPoints: 1000, icon: '💎' }
  ]
};
