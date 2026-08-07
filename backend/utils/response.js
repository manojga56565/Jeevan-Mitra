function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, ...data });
}

function error(res, message = 'Something went wrong', statusCode = 500, extra = {}) {
  return res.status(statusCode).json({ success: false, message, ...extra });
}

module.exports = { success, error };
