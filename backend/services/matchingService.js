// Which donor blood groups can fulfil a request for a given requested group.
// e.g. a request for A+ can be fulfilled by A+ or O+ donors (O is universal donor for + types; O- is universal).
const COMPATIBLE_DONORS = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // AB+ is universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-']
};

function donorGroupsThatCanFulfil(requestedGroup) {
  return COMPATIBLE_DONORS[requestedGroup] || [requestedGroup];
}

// Reverse direction: given a donor's own blood group, which requested
// groups can they fulfil? Derived from the same single source of truth
// above so the two directions can never drift out of sync.
function requestGroupsThisDonorCanFulfil(donorGroup) {
  return Object.keys(COMPATIBLE_DONORS).filter(requestedGroup =>
    COMPATIBLE_DONORS[requestedGroup].includes(donorGroup)
  );
}

module.exports = { donorGroupsThatCanFulfil, requestGroupsThisDonorCanFulfil };
