const crypto = require('crypto');
const Request = require('../models/Request');
const ApiError = require('../utils/ApiError');

/**
 * Hospital generates a QR code for an accepted request. The code itself
 * is just a random opaque token - the frontend renders it as a QR image
 * (qrcode.js) and the donor's device scans + submits the raw string back.
 */
async function generateQrCode({ hospitalId, requestId }) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  if (String(request.hospital) !== String(hospitalId)) {
    throw ApiError.forbidden('This request does not belong to your hospital');
  }
  if (request.status !== 'accepted') {
    throw ApiError.conflict('QR code can only be generated once a donor has accepted this request');
  }

  request.qrCode = crypto.randomBytes(16).toString('hex');
  request.qrVerifiedAt = null; // regenerating invalidates a prior scan
  await request.save();

  return request;
}

/**
 * Donor submits the scanned code. Confirms it's really them, at the
 * right request, with a code that hasn't been tampered with - but does
 * NOT complete the donation. Completion is a separate hospital action,
 * so a donor scanning alone can't mark a donation as done.
 */
async function verifyQrCode({ donorId, requestId, code }) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  if (String(request.acceptedDonor) !== String(donorId)) {
    throw ApiError.forbidden('You are not the accepted donor for this request');
  }
  if (request.status !== 'accepted') {
    throw ApiError.conflict(`Request is not awaiting verification (status: ${request.status})`);
  }
  if (!request.qrCode || request.qrCode !== code) {
    throw ApiError.badRequest('Invalid or expired QR code');
  }

  request.qrVerifiedAt = new Date();
  await request.save();

  return request;
}

module.exports = { generateQrCode, verifyQrCode };
