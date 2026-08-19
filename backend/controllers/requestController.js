const Request = require('../models/Request');
const { donorGroupsThatCanFulfil } = require('../services/matchingService');
const { notifyDonorsByBloodGroup, notifyDonor } = require('../services/notificationService');

// PUT /api/requests/:id/cancel
exports.cancelRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status === 'completed') {
      return res.status(409).json({ success: false, message: 'A completed request cannot be cancelled' });
    }

    request.status = 'cancelled';
    await request.save();

    // Clear this request off every compatible donor's screen — covers
    // "if the request is cancelled or closed, remove/update the notification."
    const io = req.app.get('io');
    notifyDonorsByBloodGroup(io, donorGroupsThatCanFulfil(request.bloodGroup), 'request_closed', { requestId: request._id });
    if (request.acceptedBy) notifyDonor(io, request.acceptedBy, 'request_closed', { requestId: request._id });

    res.json({ success: true, request });
  } catch (err) { next(err); }
};

// DELETE /api/requests/:id
exports.deleteRequest = async (req, res, next) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const io = req.app.get('io');
    notifyDonorsByBloodGroup(io, donorGroupsThatCanFulfil(request.bloodGroup), 'request_closed', { requestId: request._id });
    if (request.acceptedBy) notifyDonor(io, request.acceptedBy, 'request_closed', { requestId: request._id });

    res.json({ success: true, message: 'Request deleted' });
  } catch (err) { next(err); }
};
