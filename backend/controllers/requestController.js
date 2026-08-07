const requestService = require('../services/requestService');
const { success } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');

exports.listAll = asyncHandler(async (req, res) => {
  const requests = await requestService.getAllRequests();
  success(res, { requests });
});

exports.adminDelete = asyncHandler(async (req, res) => {
  await requestService.adminDeleteRequest(req.params.id);
  success(res, {}, 'Request deleted');
});
